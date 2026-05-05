
import { CreateWhatsappDto } from './dto/create-whatsapp.dto';
import { UpdateWhatsappDto } from './dto/update-whatsapp.dto';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User} from '../users/entities/user.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { Doctors } from '../doctors/entity/doctor.entity';

@Injectable()
export class WhatsappService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    
    private readonly appointmentService: AppointmentsService,
    @InjectRepository(Doctors)
    private readonly doctorRepo:Repository<Doctors>
  ) {}
extractDate(message: string): string | null {
  const regex = /\d{4}-\d{2}-\d{2}/;
  const match = message.match(regex);
  return match ? match[0] : null;
}
async extractDoctor(message: string) {
  const msg = message.toLowerCase();

  const doctors = await this.doctorRepo.find({
    select: ['id', 'name'],
  });

  const matches = doctors.filter((d) => {
    const name = d.name.toLowerCase();

    // remove "dr" and extra spaces
    const cleanName = name.replace('dr', '').trim();

    const words = cleanName.split(' ');

    return (
      msg.includes(cleanName) ||             // full match
      words.some(word => msg.includes(word)) // partial match
    );
  });

  return matches;
}
async handleDoctorSelection(
  userId: number,
  doctorId: number,
  phone: string,
  message: string,
) {
  const doctor = await this.doctorRepo.findOne({
    where: { id: doctorId },
  });

  if (!doctor) {
    return this.reply(phone, '❌ Invalid doctor ID');
  }

  const date = this.extractDate(message);

const { start, end } = this.extractTimeRange(message);

// ❌ No date
if (!date) {
  return this.reply(phone, '📅 Please provide date');
}

// ✅ FULL INPUT → DIRECT BOOK
if (date && start && end) {
  const availability = await this.appointmentService.getAvailableSlots(
    doctorId,
    date,
  );

  const result = await this.appointmentService.bookSlot({
    doctor_id: doctorId,
    appointment_date: date,
    start_time: start,
    end_time: end,
    user_id: userId,
    scheduling_type: availability.scheduling_type,
    consulting_type: 'ONLINE',
  });
  if (!result.booked) {
  return this.reply(
    phone,
    `❌ ${result.message}

👉 Next available:
📅 ${result.next_available_date}
⏰ ${result.next_available_start} - ${result.next_available_end}

Reply with  book ${doctorId} ${result.next_available_date} ${result.next_available_start} ${result.next_available_end} `
  );
}

// ✅ Booking success
return this.reply(
  phone,
  `✅ Booked!
📅 Date: ${date}
⏰ Time: ${start}-${end}
🎟 Token: ${result.TokenNo ?? result.estimatedTokenNo}`
);
}

// ⚠️ Only start → suggest slot
if (date && start && !end) {
  const slot = await this.appointmentService.findBestAvailableSlot(
    doctorId,
    date,
    start,
    undefined,
  );

  return this.reply(
    phone,
    `⏱️ Available slot:\n${slot.start} - ${slot.end}\n\n👉 Reply YES to confirm`
  );
}
  return this.reply(phone, '❌ Invalid input');
}
extractStartTime(message: string): string | null {
  const regex = /(\d{1,2}:\d{2})/; // matches 10:00, 9:30 etc
  const match = message.match(regex);

  return match ? match[0] : null;
}
extractTimeRange(message: string) {
  const regex = /(\d{1,2}:\d{2})/g;
  const matches = message.match(regex);

  return {
    start: matches?.[0] || null,
    end: matches?.[1] || null,
  };
}
  async create(dto: CreateWhatsappDto) {
  const { from, message } = dto;

  if (!from || !message) {
    throw new BadRequestException('Invalid WhatsApp payload');
  }

  let user = await this.userRepo.findOne({
    where: { mobileNumber: from },
  });

  if (!user) {
    user = await this.userRepo.save({ mobileNumber: from });
  }

  const msg = message.trim().toLowerCase();

  // ✅ 1. HANDLE NUMBER FIRST
 
  // ✅ 2. HANDLE BOOK FLOW
  if (msg.includes('book')) {
    const doctorList = await this.extractDoctor(message);
    const doctorId = this.extractDoctorId(message);

if (doctorId) {
  return this.handleDoctorSelection(
    user.id,
    doctorId,
    from,
    message
  );
}

    if (doctorList.length === 0) {
      return this.reply(
        from,
        '❌ Doctor not found.\nTry: Dr Sharma'
      );
    }
    
    if (doctorList.length > 1) {
      const list = doctorList
        .slice(0, 5)
        .map(d => `${d.id}. ${d.name}`)
        .join('\n');

      return this.reply(
        from,
        `Multiple doctors found:\n${list}\n\nReply with doctor ID`
      );
    }

    const doctor = doctorList[0];

    return this.handleDoctorSelection(
      user.id,
      doctor.id,
      from,
      message,
    );
  }

  // ✅ 3. HANDLE CANCEL
  if (msg.includes('cancel')) {
    return this.handleCancel(user.id, from);
  }

  // ❌ fallback
  return this.reply(from, 'Use: BOOK or CANCEL');
}
extractDoctorId(message: string): number | null {
  const match = message.match(/\b\d+\b/); // find number anywhere
  return match ? Number(match[0]) : null;
}
  
  async handleBooking(userId: number, message: string, phone: string) {
    const doctor_id = 1; // TODO: parse from message
    const date = this.parseDate(message);
    const time = this.parseTime(message);
    const slot = await this.appointmentService.findBestAvailableSlot(
  doctor_id,
  date,
  time,
  undefined,
);
    // 🔥 get best slot from your existing system
    const availability = await this.appointmentService.getAvailableSlots(
  doctor_id,
  date,
);

const scheduling_type = availability.scheduling_type;
const consulting_type = 'ONLINE'; 

    const result = await this.appointmentService.bookSlot({
  doctor_id,
  appointment_date: slot.date,
  start_time: slot.start,
  end_time: slot.end,
  user_id: userId,
  scheduling_type,       // ✅ FIX
  consulting_type,       // ✅ FIX
});
    return this.reply(
      phone,
      `✅ Booked!\nDate: ${slot.date}\nTime: ${slot.start}\nToken: ${result.TokenNo}`,
    );
  }
  async handleCancel(userId: number, phone: string) {
  const appointments =
    await this.appointmentService.getUserAppointments(userId);

  if (!appointments.length) {
    return this.reply(phone, '❌ No appointments found');
  }

  // ✅ pick only active (not cancelled)
  const active = appointments.find(
    (a) => a.status !== 'CANCELLED'
  );

  if (!active) {
    return this.reply(
      phone,
      '❌ All your appointments are already cancelled'
    );
  }

  await this.appointmentService.cancelAppointment(
    active.appointment_id,
    userId,
    'WhatsApp cancel',
  );

  return this.reply(
    phone,
    `✅ Appointment cancelled\n📅 ${active.appointment_date}`
  );
}
  parseDate(msg: string): string {
    if (msg.includes('tomorrow')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  }

  parseTime(msg: string): string {
    if (msg.includes('10')) return '10:00';
    if (msg.includes('11')) return '11:00';
    return '09:00';
  }
  async reply(phone: string, text: string) {

    return {
      to: phone,
      message: text,
    };
  }


  findAll() {
    return `This action returns all whatsapp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} whatsapp`;
  }

  update(id: number, updateWhatsappDto: UpdateWhatsappDto) {
    return `This action updates a #${id} whatsapp`;
  }

  remove(id: number) {
    return `This action removes a #${id} whatsapp`;
  }
}
