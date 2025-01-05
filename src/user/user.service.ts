import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InvalidUserException } from 'src/common/exception/invalid.exception';
import { GoogleUser, GuestUser } from 'src/common/interface/provider-user.interface';
import { User } from 'src/entity/user.entity';
import { QuizService } from 'src/quiz/quiz.service';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserProvider } from './enum/user-provider.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly quizService: QuizService,
  ) {}

  async createGoogleUser(user: GoogleUser) {
    const { name, providerId, email } = user;
    const userEntity = this.userRepository.create({ name, provider: UserProvider.GOOGLE, providerId, email });

    const newUser = await this.userRepository.save(userEntity);
    return newUser;
  }

  async createGuestUser() {
    const uuid = uuidv4();

    const guestUser: GuestUser = {
      name: `Guest${uuid.slice(0, 4)}`,
      email: '',
      provider: UserProvider.GUEST,
      providerId: uuid,
    };

    const newUser = await this.userRepository.save(this.userRepository.create(guestUser));
    return newUser;
  }

  async fineOneById(id: User['id']) {
    const user = await this.userRepository.findOne({ where: { id } });
    return user;
  }

  async findOneByProviderId(provider: User['provider'], providerId: User['providerId']) {
    const user = await this.userRepository.findOne({ where: { provider, providerId } });
    return user;
  }

  async getMyUserData(userId: User['id']) {
    const user: User = await this.fineOneById(userId);
    if (!user) {
      throw new InvalidUserException();
    }

    const solveData = await this.quizService.getUserSolveData(user);

    return { user, solveData };
  }
}
