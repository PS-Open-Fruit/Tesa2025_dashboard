export type CameraInfoResponse = {
    success: boolean;
    data?: {
      id: string;
      name: string;
      location: string;
      token: string;
      created_at: string;
    };
    message?: string;
  };
  
export type DetectionListResponse = {
  success: boolean;
  data?: Array<{
    id: number;
    cam_id: string;
    timestamp: string;
    image_path: string;
  }>;
};
 