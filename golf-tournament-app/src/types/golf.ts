export interface GolfCourse {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  website?: string;
  holes: number;
  par: number;
  yardage?: number;
  tees?: Tee[];
  holes_info?: Hole[];
}

export interface Tee {
  id: string;
  name: string;
  color?: string;
  rating?: number;
  slope?: number;
  yardage?: number;
  par?: number;
}

export interface Hole {
  hole: number;
  par: number;
  yardage?: number;
  handicap?: number;
  tees?: {
    [teeId: string]: {
      yardage: number;
      par: number;
    };
  };
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  hostId: string;
  courses: GolfCourse[];
  participants: Participant[];
  status: 'setup' | 'active' | 'completed';
  createdAt: Date;
  startDate?: Date;
  endDate?: Date;
}

export interface Participant {
  userId: string;
  name: string;
  handicapIndex: number;
  scores: {
    [courseId: string]: ScoreCard;
  };
}

export interface ScoreCard {
  courseId: string;
  teeId: string;
  holes: {
    [hole: number]: {
      score: number;
      handicapStrokes: number;
    };
  };
  totalScore?: number;
  netScore?: number;
  completed: boolean;
}