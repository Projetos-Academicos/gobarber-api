import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';

class ProviderController {
    async listProviders(req, res) {
        const providers = await User.findAll({
            where: { provider: true },
            attributes: ['id', 'name', 'email'],
            include: [
                {
                    model: File,
                    as: 'avatar',
                    attributes: ['id', 'name', 'path', 'url'],
                },
            ],
        });

        return res.json(providers);
    }

    // Lista todos os agendamentos do prestador de serviços e que não foi cancelado
    async listAppointments(req, res) {
        const checkUserProvider = await User.findOne({
            where: {
                id: req.userId,
                provider: true,
            },
        });

        if (!checkUserProvider) {
            return res
                .status(401)
                .json({ error: 'Usurário não é um provedor de serviços' });
        }
        const { date } = req.query;
        const parsedDate = parseISO(date);

        const appointments = await Appointment.findAll({
            where: {
                provider_id: req.userId,
                canceled_at: null,
                date: {
                    [Op.between]: [
                        startOfDay(parsedDate),
                        endOfDay(parsedDate),
                    ],
                },
            },
            order: ['date'],
        });

        return res.json(appointments);
    }
}

export default new ProviderController();
