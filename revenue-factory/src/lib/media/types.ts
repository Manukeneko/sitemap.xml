export interface MediaResult {
  buffer: Buffer;
  mimeType: string;
}

export interface ImageProvider {
  name: string;
  model: string;
  isConfigured(): boolean;
  generateImage(prompt: string): Promise<MediaResult>;
}

export interface TtsProvider {
  name: string;
  model: string;
  isConfigured(): boolean;
  synthesize(text: string): Promise<MediaResult>;
}
