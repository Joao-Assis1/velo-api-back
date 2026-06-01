import { Test, TestingModule } from '@nestjs/testing';
import { InstructorsController } from './instructors.controller';
import { InstructorsService } from './instructors.service';
import { TestModeGuard } from '../../common/test-mode/test-mode.guard';
import { TestModeService } from '../../common/test-mode/test-mode.service';

describe('InstructorsController', () => {
  let controller: InstructorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstructorsController],
      providers: [
        { provide: InstructorsService, useValue: {} },
        {
          provide: TestModeService,
          useValue: { isEnabled: jest.fn().mockReturnValue(true) },
        },
        TestModeGuard,
      ],
    }).compile();

    controller = module.get<InstructorsController>(InstructorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
