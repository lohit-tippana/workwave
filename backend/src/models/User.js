const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const educationSchema = new mongoose.Schema(
  { institution: String, degree: String, field: String, startYear: Number, endYear: Number },
  { _id: false }
);
const certificationSchema = new mongoose.Schema(
  { name: String, issuer: String, year: Number, url: String },
  { _id: false }
);
const workHistorySchema = new mongoose.Schema(
  { title: String, company: String, startDate: Date, endDate: Date, description: String },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['client', 'freelancer', 'admin'], required: true, index: true },
    profileImage: { url: String, publicId: String },
    headline: { type: String, maxlength: 150 },
    bio: { type: String, maxlength: 2000 },
    skills: [{ type: String, trim: true }],
    yearsOfExperience: { type: Number, min: 0, max: 60, default: 0 },
    hourlyRate: { type: Number, min: 0 },
    location: String,
    languages: [String],
    education: [educationSchema],
    certifications: [certificationSchema],
    workHistory: [workHistorySchema],
    availability: { type: String, enum: ['available', 'busy', 'unavailable'], default: 'available' },
    company: String, // client field
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    isSuspended: { type: Boolean, default: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.index({ skills: 1 });
userSchema.index({ name: 'text', headline: 'text', bio: 'text' });

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 10);

userSchema.methods.toSafeObject = function () {
  const o = this.toObject();
  delete o.passwordHash;
  delete o.resetPasswordToken;
  delete o.resetPasswordExpires;
  return o;
};

module.exports = mongoose.model('User', userSchema);
