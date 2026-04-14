import { EntitySchema } from 'typeorm';

export const UserSchema = new EntitySchema({
  name: 'Doctor',
  tableName: 'DoctorProfile',

  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },

    doctorName: {
      type: String,
      name: 'doctor_name',
    },

    doctorMobileNumber: {
      type: String,
      length: 15,
      unique: true,
      name: 'doctor_mobile_number',
    },

    password: {
      type: String,
      length: 255,
    },

    doctorEmail: {
      type: String,
      nullable: true,
      name: 'doctor_email',
    },

    imageUrl: {
      type: String,
      nullable: true,
      name: 'image_url',
    },

    specialization: {
      type: String,
      nullable: true,
    },

    experienceYears: {
      type: Number,
      name: 'experience_years',
      nullable: true,
    },

    achievement: {
      type: String,
      nullable: true,
    },

    googleReviewUrl: {
      type: String,
      nullable: true,
      name: 'google_review_url',
    },

    averageRating: {
      type: 'float',
      name: 'average_rating',
      nullable: true,
    },

    totalReviews: {
      type: Number,
      name: 'total_reviews',
      nullable: true,
    },

    doctorSignImage: {
      type: String,
      nullable: true,
      name: 'doctor_sign_image',
    },

    doctorStampImage: {
      type: String,
      nullable: true,
      name: 'doctor_stamp_image',
    },

    createdAt: {
      type: 'timestamp',
      createDate: true,
      name: 'created_at',
    },

    updatedAt: {
      type: 'timestamp',
      updateDate: true,
      name: 'updated_at',
    },
  },
});