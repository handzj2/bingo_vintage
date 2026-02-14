import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientsService {
  constructor(@InjectRepository(Client) private clientRepo: Repository<Client>) {}

  async registerRider(clientData: any) {
    // 1. Security Check: Prevent duplicate NIN, Phone, Email, or ID Number during registration
    const duplicateChecks = [];
    
    if (clientData.nin) {
      duplicateChecks.push({ nin: clientData.nin });
    }
    if (clientData.phone) {
      duplicateChecks.push({ phone: clientData.phone });
    }
    if (clientData.email) {
      duplicateChecks.push({ email: clientData.email });
    }
    if (clientData.idNumber) {
      duplicateChecks.push({ idNumber: clientData.idNumber });
    }
    
    if (duplicateChecks.length > 0) {
      const existing = await this.clientRepo.findOne({
        where: duplicateChecks
      });
      if (existing) {
        // Provide specific error message based on what field matched
        if (existing.nin === clientData.nin) {
          throw new ConflictException(`Client with NIN ${clientData.nin} already exists`);
        }
        if (existing.phone === clientData.phone) {
          throw new ConflictException(`Client with phone ${clientData.phone} already exists`);
        }
        if (existing.email === clientData.email) {
          throw new ConflictException(`Client with email ${clientData.email} already exists`);
        }
        if (existing.idNumber === clientData.idNumber) {
          throw new ConflictException(`Client with ID Number ${clientData.idNumber} already exists`);
        }
      }
    }

    // 2. Save all 37 potential fields (Mapping happens automatically via the Entity)
    const newClient = this.clientRepo.create(clientData);
    return await this.clientRepo.save(newClient);
  }

  async getAllRiders() {
    // Returns full KYC profiles for Admin review
    return await this.clientRepo.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const client = await this.clientRepo.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client;
  }

  // NEW: Get rider by ID with optional relations for detailed view
  async getRiderById(id: number): Promise<Client> {
    const client = await this.clientRepo.findOne({
      where: { id },
      relations: ['loans'], // Optional: includes loans if you have the relation set up
    });

    if (!client) {
      throw new NotFoundException(`Rider with ID ${id} not found`);
    }
    return client;
  }

  async update(id: number, updateData: any) {
    // 1. Check if client exists
    const client = await this.findOne(id);
    
    // 2. Security Check: Prevent duplicate NIN if it's being updated
    if (updateData.nin && updateData.nin !== client.nin) {
      const existingWithNIN = await this.clientRepo.findOne({ 
        where: { nin: updateData.nin } 
      });
      if (existingWithNIN) {
        throw new ConflictException(`Another client with NIN ${updateData.nin} already exists`);
      }
    }

    // 3. Security Check: Prevent duplicate email if it's being updated
    if (updateData.email && updateData.email !== client.email) {
      const existingWithEmail = await this.clientRepo.findOne({ 
        where: { email: updateData.email } 
      });
      if (existingWithEmail) {
        throw new ConflictException(`Another client with email ${updateData.email} already exists`);
      }
    }

    // 4. Security Check: Prevent duplicate idNumber if it's being updated
    if (updateData.idNumber && updateData.idNumber !== client.idNumber) {
      const existingWithIdNumber = await this.clientRepo.findOne({ 
        where: { idNumber: updateData.idNumber } 
      });
      if (existingWithIdNumber) {
        throw new ConflictException(`Another client with ID Number ${updateData.idNumber} already exists`);
      }
    }

    // 5. Security Check: Prevent duplicate phone if it's being updated
    if (updateData.phone && updateData.phone !== client.phone) {
      const existingWithPhone = await this.clientRepo.findOne({ 
        where: { phone: updateData.phone } 
      });
      if (existingWithPhone) {
        throw new ConflictException(`Another client with phone ${updateData.phone} already exists`);
      }
    }

    // 6. Merge new data (Occupation, Bank details, etc.) into the existing record
    // This automatically handles the 37 columns from your CSV mapping
    Object.assign(client, updateData);
    
    // 7. Save the changes
    return await this.clientRepo.save(client);
  }

  // NEW: Delete rider by ID - vital for corrections since transactions cannot be edited once saved [cite: 2026-01-10]
  async delete(id: number): Promise<void> {
    const result = await this.clientRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Rider with ID ${id} not found`);
    }
  }
}