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

export interface ImageData {
  buffer: ArrayBuffer
  base64: string
  dataUrl: string
}

export namespace StableDiffusionWebUI {
  export interface Request {
    prompt: string
    negative_prompt?: string
    enable_hr?: boolean
    denoising_strength?: number
    firstphase_width?: number
    firstphase_height?: number
    styles?: string[]
    seed?: number
    subseed?: number
    subseed_strength?: number
    seed_resize_from_h?: number
    seed_resize_from_w?: number
    batch_size?: number
    n_iter?: number
    steps?: number
    cfg_scale?: number
    width?: number
    height?: number
    restore_faces?: boolean
    tiling?: boolean
    eta?: number
    s_churn?: number
    s_tmax?: number
    s_tmin?: number
    s_noise?: number
    sampler_index?: string
  }

  export interface Response {
    /** Image list in base64 format */
    images: string[]
    parameters: any
    info: any
  }
}
