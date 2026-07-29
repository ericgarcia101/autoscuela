// ---------------------------------------------------------------------------
// Tipos del dominio.
//
// Se escriben a mano en lugar de generarlos con `supabase gen types` para que
// el proyecto compile sin necesidad de tener la CLI conectada. Si prefieres
// generarlos, sustituye este archivo por la salida de:
//   supabase gen types typescript --project-id <ref> > src/lib/types.ts
// ---------------------------------------------------------------------------

export type UserRole = 'student' | 'instructor' | 'admin' | 'owner'

export type LicenseClass =
  | 'AM' | 'A1' | 'A2' | 'A' | 'B' | 'B96' | 'BE'
  | 'C1' | 'C1E' | 'C' | 'CE' | 'D1' | 'D1E' | 'D' | 'DE' | 'BTP' | 'LCC'

export type StudentStatus =
  | 'lead' | 'enrolled' | 'theory_pass' | 'practical' | 'graduated' | 'paused' | 'dropped'

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned' | 'expired'
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'refunded' | 'cancelled'
export type ExamKind = 'theory' | 'practical' | 'maneuvers'
export type ExamResult = 'scheduled' | 'passed' | 'failed' | 'absent' | 'cancelled'
export type MessageAuthor = 'student' | 'staff' | 'ai' | 'system'
export type ConversationKind = 'support' | 'ai_tutor' | 'group'

export interface School {
  id: string
  name: string
  slug: string
  tax_id: string | null
  address: string | null
  postal_code: string | null
  province: string | null
  logo_url: string | null
  brand_color: string | null
  plan: 'trial' | 'basic' | 'pro' | 'enterprise'
  seat_limit: number
  trial_ends_at: string | null
  city: string | null
  phone: string | null
  email: string | null
  settings: Record<string, unknown>
}

export interface Profile {
  id: string
  school_id: string | null
  role: UserRole
  full_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  dni: string | null
  birth_date: string | null
  target_license: LicenseClass
  status: StudentStatus
  enrolled_at: string | null
  theory_exam_date: string | null
  notes: string | null
  last_seen_at: string | null
  is_active: boolean
}

export interface Topic {
  id: string
  code: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  position: number
}

export interface Question {
  id: string
  topic_id: string
  text: string
  options: string[]
  correct_index: number
  explanation: string
  legal_ref: string | null
  legal_url: string | null
  image_url: string | null
  image_alt: string | null
  difficulty: number
  licenses: LicenseClass[]
  tags: string[]
  times_answered: number
  times_correct: number
  status: 'draft' | 'review' | 'published' | 'retired'
  source: 'normativa' | 'school' | 'ai' | 'official'
}

/** La pregunta tal y como la recibe el reproductor: sin `correct_index`. */
export type PlayableQuestion = Omit<Question, 'correct_index' | 'explanation' | 'legal_ref'>

export interface TestTemplate {
  id: string
  school_id: string | null
  code: string
  name: string
  description: string | null
  category: string
  icon: string | null
  is_system: boolean
  question_count: number
  time_limit_sec: number | null
  max_failures: number | null
  pass_threshold: number
  rules: Record<string, unknown>
  instant_feedback: boolean
  shuffle_options: boolean
  allow_review: boolean
  sudden_death: boolean
  position: number
}

export interface TestSession {
  id: string
  student_id: string
  template_code: string | null
  title: string
  status: SessionStatus
  question_ids: string[]
  total_questions: number
  answered: number
  correct: number
  incorrect: number
  blank: number
  score: number | null
  passed: boolean | null
  time_limit_sec: number | null
  max_failures: number | null
  pass_threshold: number
  duration_sec: number | null
  config: {
    instant_feedback?: boolean
    shuffle_options?: boolean
    allow_review?: boolean
    sudden_death?: boolean
    rules?: Record<string, unknown>
  }
  started_at: string
  finished_at: string | null
}

export interface AnswerFeedback {
  is_correct: boolean
  correct_index: number
  explanation: string
  legal_ref: string | null
  legal_url: string | null
}

export interface SessionSummary {
  score: number
  passed: boolean
  correct: number
  incorrect: number
  blank: number
  total: number
  already_finished?: boolean
}

export interface Assignment {
  id: string
  school_id: string
  template_id: string | null
  student_id: string
  title: string
  message: string | null
  due_at: string | null
  status: AssignmentStatus
  attempts_allowed: number
  attempts_used: number
  best_score: number | null
  created_at: string
}

export interface Conversation {
  id: string
  school_id: string
  kind: ConversationKind
  student_id: string | null
  title: string | null
  last_message_at: string
  last_message_text: string | null
  unread_for_student: number
  unread_for_staff: number
  is_archived: boolean
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string | null
  author: MessageAuthor
  body: string
  citations: { ref?: string | null; topic?: string }[]
  read_at: string | null
  created_at: string
}

export interface Lesson {
  id: string
  student_id: string
  instructor_id: string | null
  vehicle_id: string | null
  starts_at: string
  duration_min: number
  status: LessonStatus
  pickup_point: string | null
  rating: number | null
  student_visible_notes: string | null
  instructor_notes: string | null
  price_cents: number | null
}

export interface Payment {
  id: string
  student_id: string
  concept: string
  amount_cents: number
  status: PaymentStatus
  method: string | null
  due_date: string | null
  paid_at: string | null
  invoice_ref: string | null
}

export interface Exam {
  id: string
  student_id: string
  kind: ExamKind
  license: LicenseClass
  scheduled_at: string | null
  location: string | null
  result: ExamResult
  faults: number | null
  notes: string | null
}

export interface Announcement {
  id: string
  school_id: string
  title: string
  body: string
  pinned: boolean
  audience: 'all' | 'students' | 'staff'
  publish_at: string
  expires_at: string | null
  created_by: string | null
  created_at: string
}

export interface StudentStats {
  student_id: string
  points: number
  current_streak: number
  longest_streak: number
  last_activity_on: string | null
  sessions_completed: number
  questions_answered: number
  questions_correct: number
  study_minutes: number
}

export interface Achievement {
  code: string
  name: string
  description: string
  icon: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  points: number
  position: number
}

export interface TopicBreakdown {
  topic_id: string
  topic_code: string
  topic_name: string
  answered: number
  correct: number
  accuracy: number
}

export interface Readiness {
  readiness: number
  recent_average: number
  sessions: number
  coverage: number
  weak_topics: string[]
  verdict: 'listo' | 'casi' | 'en_progreso' | 'inicial'
}

export interface StudentOverview {
  student_id: string
  full_name: string
  email: string | null
  status: StudentStatus
  target_license: LicenseClass
  sessions: number
  avg_score: number | null
  last_activity: string | null
  current_streak: number
  pending_tasks: number
  unread_messages: number
}

export interface AiReply {
  answer: string
  fallback_used: boolean
  quota_remaining: number
  citations: { ref?: string | null; topic?: string }[]
}

// Nota: el cliente de Supabase se crea sin genérico `Database`. Para tipado
// estricto de las tablas, genera el esquema real y pásalo a `createClient`:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.ts
