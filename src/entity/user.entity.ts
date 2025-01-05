import { Exclude } from 'class-transformer';
import { UserProvider } from 'src/user/enum/user-provider.enum';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user' })
export class User {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: string;

  @Column({ name: 'email', type: 'varchar' })
  email: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'provider', type: 'enum', enum: UserProvider })
  provider: UserProvider;

  @Column({ name: 'provider_id', type: 'varchar' })
  providerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  @Exclude({ toPlainOnly: true })
  deletedAt: Date | null;
}
