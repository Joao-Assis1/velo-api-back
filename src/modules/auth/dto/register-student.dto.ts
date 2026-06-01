import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { RegisterDto } from './register.dto';

export class RegisterStudentDto extends RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'CPF é obrigatório para alunos.' })
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos.',
  })
  declare cpf: string;
}
