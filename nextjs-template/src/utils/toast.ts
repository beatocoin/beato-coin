// Temporary toast utility until we implement a proper toast solution
// This is a placeholder that just logs to the console

type ToastFunction = {
  (message: string): void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => Promise<T>;
};

const toast: ToastFunction = Object.assign(
  (message: string) => {
    console.log('TOAST:', message);
  },
  {
    success: (message: string) => {
      console.log('TOAST SUCCESS:', message);
    },
    error: (message: string) => {
      console.error('TOAST ERROR:', message);
    },
    info: (message: string) => {
      console.info('TOAST INFO:', message);
    },
    warning: (message: string) => {
      console.warn('TOAST WARNING:', message);
    },
    promise: <T>(
      promise: Promise<T>,
      options: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: Error) => string);
      }
    ): Promise<T> => {
      console.log('TOAST LOADING:', options.loading);
      
      return promise
        .then((data) => {
          const successMessage = typeof options.success === 'function' 
            ? options.success(data) 
            : options.success;
          console.log('TOAST SUCCESS:', successMessage);
          return data;
        })
        .catch((error) => {
          const errorMessage = typeof options.error === 'function'
            ? options.error(error)
            : options.error;
          console.error('TOAST ERROR:', errorMessage);
          throw error;
        });
    }
  }
);

export { toast }; 