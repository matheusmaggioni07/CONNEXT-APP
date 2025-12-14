export interface GenerateCodeParams {
  prompt: string
  projectContext?: Array<{ name: string; content: string }>
  history?: Array<{ role: string; content: string }>
  userId?: string
}
