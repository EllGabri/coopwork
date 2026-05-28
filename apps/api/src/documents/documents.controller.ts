import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  ParseIntPipe,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';

type AuthUser = JwtPayload & { userId: string };

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.documentsService.findAll(user.tenantId, user.role, { categoryId, search });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.upload(file, dto, user.tenantId, user.userId, user.role);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const doc = await this.documentsService.findOne(id, user.tenantId, user.role);
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] ?? req.ip ?? null;
    await this.documentsService.logAccess(id, user.userId, 'view', ip);
    return doc;
  }

  @Get(':id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] ?? req.ip ?? null;
    const userName = (user as AuthUser & { fullName?: string }).fullName ?? user.email;
    const result = await this.documentsService.downloadDocument(
      id,
      user.tenantId,
      user.userId,
      userName,
      user.role,
      ip,
    );
    if (result.type === 'redirect') {
      return res.json({ signedUrl: result.signedUrl, expiresIn: 3600 });
    }
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length,
    });
    res.send(result.buffer);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.update(id, dto, user.tenantId, user.userId, user.role);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.softDelete(id, user.tenantId, user.userId, user.role);
  }

  @Get(':id/audit-log')
  getAuditLog(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.getAuditLog(id, user.tenantId, user.role);
  }

  @Get(':id/versions')
  getVersions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.getVersions(id, user.tenantId, user.role);
  }

  @Post(':id/versions')
  @UseInterceptors(FileInterceptor('file'))
  uploadNewVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('comment') comment: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.uploadNewVersion(
      id,
      file,
      comment,
      user.tenantId,
      user.userId,
      user.role,
    );
  }

  @Post(':id/versions/:version/restore')
  restoreVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.restoreVersion(id, version, user.tenantId, user.userId, user.role);
  }
}
