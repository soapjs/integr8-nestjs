import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService, User } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): User[] {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): User | undefined {
    return this.usersService.findOne(+id);
  }

  @Post()
  create(@Body() user: Omit<User, 'id'>): User {
    return this.usersService.create(user);
  }
}

