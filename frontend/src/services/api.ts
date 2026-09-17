import axios, { AxiosError } from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('workwave_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    const message =
      err.response?.data?.message ||
      (err.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running?' : err.message);
    return Promise.reject(Object.assign(new Error(message), {
      status: err.response?.status,
      details: err.response?.data?.details,
    }));
  }
);

export default api;
