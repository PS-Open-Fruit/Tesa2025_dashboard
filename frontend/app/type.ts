export type CameraInfoResponse = {
    success: boolean;
    data?: {
      id: string;
      name: string;
      location: string;
      token: string;
      sort?: number;
      Institute?: string;
      created_at?: string;
    };
    message?: string;
  };
  
export type DetectionListResponse = {
  success: boolean;
  data?: Array<{
    id: number;
    cam_id: string;
    camera?: CameraDetail;
    timestamp: string;
    image_path: string;
    objects?: DetectionObject[];
  }>;
};

export type DetectionObject = {
  obj_id: string;
  type: string;
  lat: string | number;
  lng: string | number;
  objective?: string | null;
  size?: string | null;
  details?: any | null;
};

export type CameraDetail = {
  id: string;
  name: string;
  location?: string;
  token?: string;
  sort?: number;
  Institute?: string;
};

export type DetectionItem = {
  id: number;
  cam_id: string;
  camera?: CameraDetail;
  timestamp: string;
  image_path: string;
  objects?: DetectionObject[];
};

export type DetectionListResponseFull = {
  success: boolean;
  data: DetectionItem[];
};
 