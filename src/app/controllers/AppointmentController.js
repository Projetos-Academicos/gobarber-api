import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';

import User from '../models/User';
import File from '../models/File';

import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
    // Lista todos os agendamentos do usuario e que não foi cancelado
    async index(req, res) {
        const { page = 1 } = req.query; // Paginação

        const appointments = await Appointment.findAll({
            where: { user_id: req.userId, canceled_at: null },
            attributes: ['id', 'date', 'past', 'cancelable'],
            order: ['date'],
            limit: 20, // Paginação
            offset: (page - 1) * 20, // Paginação
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: File,
                            as: 'avatar',
                            attributes: ['id', 'name', 'path', 'url'],
                        },
                    ],
                },
            ],
        });

        return res.json(appointments);
    }

    async create(req, res) {
        // Configuração das validações no YUP
        const schema = Yup.object().shape({
            date: Yup.date().required(),
            provider_id: Yup.number().required(),
        });

        // Validação dos campos pelo YUP
        if (!(await schema.isValid(req.body))) {
            return res
                .status(400)
                .json({ error: 'Falha na validação dos campos' });
        }

        const { date, provider_id } = req.body;

        //  Validando se o provider_id é um provedor de serviço válido
        const isProvider = await User.findOne({
            where: { id: provider_id, provider: true },
        });

        if (!isProvider) {
            return res
                .status(401)
                .json({ error: 'Provedor de Serviço Inválido' });
        }

        // Validação de DATA/HORA passada, para aceitar apenas horários futuros
        const hourStart = startOfHour(parseISO(date));

        if (isBefore(hourStart, new Date())) {
            return res
                .status(400)
                .json({ error: 'Data do Agendamento Inválida' });
        }

        // Validação de horário ainda dispoinivel para o prestador de serviço
        const checkAvailability = await Appointment.findOne({
            where: {
                provider_id,
                canceled_at: null,
                date: hourStart,
            },
        });

        if (checkAvailability) {
            return res
                .status(400)
                .json({ error: 'Data do Agendamento Indispónivel' });
        }

        // Validação de prestador agendando horario pra si mesmo

        if (req.userId === provider_id) {
            return res.status(400).json({
                error: 'Não é permitido agendar horário para sí próprio',
            });
        }

        const appointment = await Appointment.create({
            user_id: req.userId,
            date,
            provider_id,
        });

        const user = await User.findByPk(req.userId);
        const formattedDate = format(
            hourStart,
            "'dia' dd 'de' MMMM', às' H:mm'h'",
            { locale: pt }
        );

        // Notificar o prestador de serviços sobre o agendamento

        await Notification.create({
            content: `Novo agendamento de ${user.name} para o ${formattedDate}`,
            user: provider_id,
        });

        return res.json({
            id: appointment.id,
            user_id: req.userId,
            provider_id,
            date,
        });
    }

    async delete(req, res) {
        const appointment = await Appointment.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['name', 'email'],
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['name'],
                },
            ],
        });

        if (appointment.canceled_at) {
            return res.status(401).json({
                error: 'Esse agendamento já foi cancelado',
            });
        }

        if (appointment.user_id !== req.userId) {
            return res.status(401).json({
                error: 'Você não tem permissão para cancelar esse agendamento',
            });
        }
        const dateWithSub = subHours(appointment.date, 2);

        if (isBefore(dateWithSub, new Date())) {
            return res.status(400).json({
                error:
                    'O cancelamento de agendamento só pode ser realizado com antecedencia miníma de 2 horas',
            });
        }

        appointment.canceled_at = new Date();
        await appointment.save();

        await Queue.add(CancellationMail.key, { appointment });

        return res.json(appointment);
    }
}

export default new AppointmentController();
