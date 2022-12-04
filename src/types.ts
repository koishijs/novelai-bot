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

  /**
   * @see https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/828438b4a190759807f9054932cae3a8b880ddf1/modules/api/models.py#L122
   */
  export interface ExtraSingleImageRequest {
    image: string
    /** Sets the resize mode: 0 to upscale by upscaling_resize amount, 1 to upscale up to upscaling_resize_h x upscaling_resize_w. */
    resize_mode?: 0 | 1
    show_extras_results?: boolean
    gfpgan_visibility?: number // float
    codeformer_visibility?: number // float
    codeformer_weight?: number // float
    upscaling_resize?: number // float
    upscaling_resize_w?: number // int
    upscaling_resize_h?: number // int
    upscaling_crop?: boolean
    upscaler_1?: string
    upscaler_2?: string
    extras_upscaler_2_visibility?: number // float
    upscale_first?: boolean
  }

  export interface ExtraSingleImageResponse {
    image: string
  }
}
