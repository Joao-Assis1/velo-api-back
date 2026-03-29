import { GetHealthUseCase } from './modules/health/application/get-health.use-case';

describe('GetHealthUseCase', () => {
  let useCase: GetHealthUseCase;

  beforeEach(() => {
    useCase = new GetHealthUseCase();
  });

  it('should return health status for VELO-api', () => {
    expect(useCase.execute()).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'VELO-api',
      }),
    );
  });
});
