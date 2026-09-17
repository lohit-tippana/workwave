export type Role = 'client' | 'freelancer' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  profileImage?: { url: string; publicId?: string };
  headline?: string;
  bio?: string;
  skills?: string[];
  yearsOfExperience?: number;
  hourlyRate?: number;
  location?: string;
  languages?: string[];
  education?: { institution?: string; degree?: string; field?: string; startYear?: number; endYear?: number }[];
  certifications?: { name?: string; issuer?: string; year?: number; url?: string }[];
  workHistory?: { title?: string; company?: string; startDate?: string; endDate?: string; description?: string }[];
  availability?: 'available' | 'busy' | 'unavailable';
  company?: string;
  rating?: number;
  reviewCount?: number;
  isSuspended?: boolean;
  createdAt?: string;
}

export interface Job {
  _id: string;
  clientId: User | string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  experienceLevel: 'entry' | 'intermediate' | 'expert';
  budget: number;
  budgetType: 'fixed' | 'hourly';
  deadline?: string;
  attachments?: { url: string; name?: string }[];
  status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  aiAnalysis?: any;
  proposalCount: number;
  createdAt: string;
}

export interface Proposal {
  _id: string;
  jobId: Job | string;
  freelancerId: User | string;
  coverLetter: string;
  proposedAmount: number;
  estimatedDays: number;
  status: 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN';
  aiMatch?: MatchResult;
  createdAt: string;
}

export interface MatchResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  relevantExperience?: string;
  explanation?: string;
  disclaimer?: string;
}

export interface Milestone {
  _id: string;
  title: string;
  description?: string;
  amount: number;
  dueDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUESTED' | 'COMPLETED';
  submission?: { note?: string; files?: { url: string; name?: string }[]; submittedAt?: string };
  revisionNote?: string;
}

export interface Project {
  _id: string;
  jobId: Job | string;
  proposalId: string;
  clientId: User | string;
  freelancerId: User | string;
  title: string;
  description?: string;
  budget: number;
  deadline?: string;
  progress: number;
  status: 'PENDING' | 'ACTIVE' | 'IN_REVIEW' | 'REVISION_REQUESTED' | 'COMPLETED' | 'CANCELLED';
  milestones: Milestone[];
  clientReviewed?: boolean;
  freelancerReviewed?: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: { text: string; senderId: string; createdAt: string };
  unread?: number;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User | string;
  text: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Payment {
  _id: string;
  projectId: { _id: string; title: string } | string;
  milestoneId?: string;
  amount: number;
  currency: string;
  status: 'CREATED' | 'SUCCESS' | 'FAILED' | 'VERIFICATION_FAILED';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export interface Paged<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
