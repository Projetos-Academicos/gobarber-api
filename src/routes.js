import { Router } from 'express';
import multer from 'multer';
import multerConfig from './config/multer';

// Imports de Controllers
import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import FileController from './app/controllers/FileController';
import ProviderController from './app/controllers/ProviderController';
import AppointmentController from './app/controllers/AppointmentController';
import NotificationController from './app/controllers/NotificationController';
import AvailableController from './app/controllers/AvailableController';

// Imports de Middlewares
import authMiddleware from './app/middlewares/auth';

const routes = new Router();
const upload = multer(multerConfig);

// Rotas Livres
routes.post('/users', UserController.create);
routes.post('/session', SessionController.create);

// Adicionando Middleware de Autentificação
routes.use(authMiddleware);

// Rotas Autenticadas
routes.put('/users', UserController.update);
routes.post('/file', upload.single('file'), FileController.create);
routes.get('/providers', ProviderController.listProviders);
routes.get('/providers/:id/available', AvailableController.index);
routes.get('/scheduled', ProviderController.listAppointments);
routes.get('/notifications', NotificationController.index);
routes.put('/notifications/:id', NotificationController.update);
routes.post('/appointments', AppointmentController.create);
routes.get('/appointments', AppointmentController.index);
routes.delete('/appointments/:id', AppointmentController.delete);

export default routes;
