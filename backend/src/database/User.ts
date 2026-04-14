import { EntitySchema } from 'typeorm';

export const UserSchema = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    name: {
      type: String,
    },
    mobileNumber: {
      type: String,
      length: 15,
      unique: true,
    },
  }, 
});