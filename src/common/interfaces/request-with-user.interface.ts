export interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: 'student' | 'instructor';
  };
}
