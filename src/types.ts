export interface Perks {
  maxPriorityActions: number
  startPriority: number
  contextTokens: number
  moduleTrainingSteps: number
  unlimitedMaxPriority: boolean
  voiceGeneration: boolean
  imageGeneration: boolean
  unlimitedImageGeneration: boolean
  unlimitedImageGenerationLimits: {
    resolution: number
    maxPrompts: number
  }[]
}

export interface PaymentProcessorData {
  c: string
  n: number
  o: string
  p: number
  r: string
  s: string
  t: number
  u: string
}

export interface TrainingStepsLeft {
  fixedTrainingStepsLeft: number
  purchasedTrainingSteps: number
}

export interface Subscription {
  tier: number
  active: boolean
  expiresAt: number
  perks: Perks
  paymentProcessorData: PaymentProcessorData
  trainingStepsLeft: TrainingStepsLeft
}
