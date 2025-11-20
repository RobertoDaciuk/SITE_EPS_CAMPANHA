import { Test, TestingModule } from '@nestjs/testing';
import { FinanceiroService } from './financeiro.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    usuario: {
        findMany: jest.fn(),
        update: jest.fn(),
    },
    relatorioFinanceiro: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
    },
    loteFinanceiro: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
    },
    envioVenda: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
    },
    campanha: {
        findFirst: jest.fn(),
    },
};

describe('FinanceiroService', () => {
    let service: FinanceiroService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FinanceiroService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<FinanceiroService>(FinanceiroService);
        prisma = module.get<PrismaService>(PrismaService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('cancelarLote', () => {
        it('should cancel a pending batch and refund reserved balance', async () => {
            const numeroLote = 'LOTE-2025-11-001';
            const adminId = 'admin-uuid';
            const relatorios = [
                { id: 'rel-1', usuarioId: 'user-1', valor: 100, status: 'PENDENTE', numeroLote },
                { id: 'rel-2', usuarioId: 'user-2', valor: 200, status: 'PENDENTE', numeroLote },
            ];

            mockPrismaService.relatorioFinanceiro.findMany.mockResolvedValue(relatorios);
            mockPrismaService.relatorioFinanceiro.updateMany.mockResolvedValue({ count: 2 });

            const result = await service.cancelarLote(numeroLote, adminId);

            expect(mockPrismaService.relatorioFinanceiro.findMany).toHaveBeenCalledWith({ where: { numeroLote } });
            expect(mockPrismaService.usuario.update).toHaveBeenCalledTimes(2);
            expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: { saldoReservado: { decrement: 100 }, saldoPontos: { increment: 100 } },
            });
            expect(mockPrismaService.relatorioFinanceiro.updateMany).toHaveBeenCalledWith({
                where: { numeroLote },
                data: { status: 'CANCELADO', deletedAt: expect.any(Date) },
            });
            expect(result).toEqual({
                numeroLote,
                totalCancelados: 2,
                valorDevolvido: 300,
                canceladoPor: adminId,
                canceladoEm: expect.any(Date),
            });
        });

        it('should throw NotFoundException if batch not found', async () => {
            mockPrismaService.relatorioFinanceiro.findMany.mockResolvedValue([]);

            await expect(service.cancelarLote('INVALID-LOTE', 'admin-id'))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException if batch already processed', async () => {
            const relatorios = [
                { id: 'rel-1', status: 'PAGO', numeroLote: 'LOTE-PAGO' },
            ];
            mockPrismaService.relatorioFinanceiro.findMany.mockResolvedValue(relatorios);

            await expect(service.cancelarLote('LOTE-PAGO', 'admin-id'))
                .rejects.toThrow(ConflictException);
        });
    });
});
