export {}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
          }) => void
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              type?: 'standard' | 'icon'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
              width?: number
            }
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

declare module 'react-icons/fc' {
  import { IconType } from 'react-icons';
  export const FcGoogle: IconType;
  export const FcInfo: IconType;
}

declare module 'react-icons/gi' {
  import { IconType } from 'react-icons';
  export const GiBiceps: IconType;
  export const GiAbstract020: IconType;
  export const GiAbstract041: IconType;
  export const GiAbstract047: IconType;
  // Add other icons as needed, or make it generic
}
