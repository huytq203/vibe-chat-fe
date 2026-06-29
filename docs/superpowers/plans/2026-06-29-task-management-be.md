# Task Management — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WebSocket real-time, comments, checklists, tags, assignees, S3 attachments, task detail, activity log, and reports endpoints to task-service.

**Architecture:** NestJS Modular Monolith — each new feature = its own module. EventEmitter2 bridges service events to the Socket.io Gateway which broadcasts to named rooms (`project:{id}`, `task:{id}`). All new modules follow the existing Controller → Service → Repository → Prisma pattern.

**Tech Stack:** NestJS 11, TypeScript 5 strict, Prisma/MySQL, Socket.io, AWS SDK v3 (S3/MinIO), Jest, Joi validation.

## Global Constraints

- All identifiers in English; Vietnamese only in comments/messages
- No `any`, `Object`, `{}` types — use explicit types or `unknown`
- Repository exposes intent-named methods, never generic `find(filter)`
- Throw `HttpException` subclasses with `{ code: ErrorCode.X, message: '...' }` — never raw `Error`
- Every service method logs at `info` (action) or `error` (failure)
- All endpoints need `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`
- `npm run lint && npm run build` must pass after every task
- Working directory: `/home/huytq/code/my/be/task-service`

---

### Task 1: Install deps + extend Config (S3 + Socket.io)

**Files:**
- Modify: `package.json` (install)
- Modify: `src/config/configuration.ts`
- Modify: `src/config/env.validation.ts`
- Create: `.env.example` additions

**Interfaces:**
- Produces: `AppConfig.s3`, `AppConfig.userServiceUrl` used by Tasks 2, 9

- [ ] **Step 1: Install packages**

```bash
cd /home/huytq/code/my/be/task-service
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io \
  @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install --save-dev @types/multer
```

Expected: packages added to node_modules, package-lock updated.

- [ ] **Step 2: Extend `src/config/configuration.ts`**

Replace the full file content:

```typescript
export const APP_CONFIG = 'APP_CONFIG';

export interface AppConfig {
  nodeEnv: 'development' | 'staging' | 'production' | 'test';
  port: number;
  corsOrigins: string[];
  databaseUrl: string;
  redis: { host: string; port: number; password: string | null; db: number };
  keycloak: { issuer: string; audience: string; jwksUri: string };
  swagger: { enabled: boolean; path: string };
  s3: {
    internalEndpoint: string;
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
    bucketAttachments: string;
    uploadUrlTtl: number;
    downloadUrlTtl: number;
    downloadUrlWindowSeconds: number;
  };
  userServiceUrl: string;
}

export const loadAppConfig = (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
  port: Number(process.env.PORT ?? 3002),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || null,
    db: Number(process.env.REDIS_DB ?? 0),
  },
  keycloak: {
    issuer: process.env.KEYCLOAK_ISSUER ?? '',
    audience: process.env.KEYCLOAK_AUDIENCE ?? '',
    jwksUri: process.env.KEYCLOAK_JWKS_URI ?? '',
  },
  swagger: {
    enabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
    path: process.env.SWAGGER_PATH ?? 'docs',
  },
  s3: {
    internalEndpoint: process.env.S3_INTERNAL_ENDPOINT ?? 'http://localhost:9000',
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'auto',
    accessKey: process.env.S3_ACCESS_KEY ?? '',
    secretKey: process.env.S3_SECRET_KEY ?? '',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    bucketAttachments: process.env.S3_BUCKET_ATTACHMENTS ?? 'vibe-attachments',
    uploadUrlTtl: Number(process.env.S3_UPLOAD_URL_TTL_SECONDS ?? 3600),
    downloadUrlTtl: Number(process.env.S3_DOWNLOAD_URL_TTL_SECONDS ?? 7200),
    downloadUrlWindowSeconds: Number(process.env.S3_DOWNLOAD_URL_WINDOW_SECONDS ?? 3600),
  },
  userServiceUrl: process.env.USER_SERVICE_URL ?? 'http://localhost:3000',
});
```

- [ ] **Step 3: Extend `src/config/env.validation.ts`**

Add after existing Joi keys (before closing `)`):

```typescript
  S3_INTERNAL_ENDPOINT: Joi.string().uri().required(),
  S3_ENDPOINT: Joi.string().uri().required(),
  S3_REGION: Joi.string().required(),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_FORCE_PATH_STYLE: Joi.string().valid('true', 'false').default('true'),
  S3_BUCKET_ATTACHMENTS: Joi.string().required(),
  S3_UPLOAD_URL_TTL_SECONDS: Joi.number().default(3600),
  S3_DOWNLOAD_URL_TTL_SECONDS: Joi.number().default(7200),
  S3_DOWNLOAD_URL_WINDOW_SECONDS: Joi.number().default(3600),
  USER_SERVICE_URL: Joi.string().uri().required(),
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(config): add S3 + Socket.io deps, extend AppConfig with s3 and userServiceUrl"
```

---

### Task 2: StorageModule (S3/MinIO)

**Files:**
- Create: `src/modules/storage/s3.provider.ts`
- Create: `src/modules/storage/storage.service.ts`
- Create: `src/modules/storage/storage.module.ts`

**Interfaces:**
- Consumes: `AppConfig.s3` (Task 1)
- Produces: `StorageService` — used by Task 10 (AttachmentsModule)

- [ ] **Step 1: Create `src/modules/storage/s3.provider.ts`**

```typescript
import { Provider } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { APP_CONFIG } from '@/config/configuration';
import type { AppConfig } from '@/config/configuration';

export const S3_CLIENT = 'S3_CLIENT';
export const S3_PRESIGN_CLIENT = 'S3_PRESIGN_CLIENT';

const baseConfig = (cfg: AppConfig) => ({
  region: cfg.s3.region,
  forcePathStyle: cfg.s3.forcePathStyle,
  credentials: { accessKeyId: cfg.s3.accessKey, secretAccessKey: cfg.s3.secretKey },
  requestChecksumCalculation: 'WHEN_REQUIRED' as const,
  responseChecksumValidation: 'WHEN_REQUIRED' as const,
});

export const s3ClientProvider: Provider = {
  provide: S3_CLIENT,
  inject: [APP_CONFIG],
  useFactory: (cfg: AppConfig): S3Client =>
    new S3Client({ ...baseConfig(cfg), endpoint: cfg.s3.internalEndpoint }),
};

export const s3PresignClientProvider: Provider = {
  provide: S3_PRESIGN_CLIENT,
  inject: [APP_CONFIG],
  useFactory: (cfg: AppConfig): S3Client =>
    new S3Client({ ...baseConfig(cfg), endpoint: cfg.s3.endpoint }),
};
```

- [ ] **Step 2: Create `src/modules/storage/storage.service.ts`**

```typescript
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { S3_CLIENT, S3_PRESIGN_CLIENT } from './s3.provider';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    @Inject(S3_PRESIGN_CLIENT) private readonly s3Presign: S3Client,
  ) {}

  createUploadUrl(input: {
    bucket: string;
    key: string;
    contentType: string;
    expiresIn: number;
  }): Promise<string> {
    return getSignedUrl(
      this.s3Presign,
      new PutObjectCommand({ Bucket: input.bucket, Key: input.key, ContentType: input.contentType }),
      { expiresIn: input.expiresIn },
    );
  }

  createDownloadUrl(input: {
    bucket: string;
    key: string;
    expiresIn: number;
    windowSeconds?: number;
  }): Promise<string> {
    const signingDate =
      input.windowSeconds && input.windowSeconds > 0
        ? new Date(
            Math.floor(Date.now() / (input.windowSeconds * 1000)) *
              (input.windowSeconds * 1000),
          )
        : undefined;
    return getSignedUrl(
      this.s3Presign,
      new GetObjectCommand({ Bucket: input.bucket, Key: input.key }),
      { expiresIn: input.expiresIn, signingDate },
    );
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    this.logger.log(`Đã xóa S3 object: ${bucket}/${key}`);
  }
}
```

- [ ] **Step 3: Create `src/modules/storage/storage.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { s3ClientProvider, s3PresignClientProvider } from './s3.provider';
import { StorageService } from './storage.service';

@Module({
  providers: [s3ClientProvider, s3PresignClientProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 4: Add StorageModule to `src/app.module.ts`**

Add `StorageModule` to the imports array:

```typescript
import { StorageModule } from './modules/storage/storage.module';

// In @Module({ imports: [...] })
StorageModule,
```

- [ ] **Step 5: Build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(storage): add S3 StorageModule with presigned URL support"
```

---

### Task 3: UserSnapshot Module

**Files:**
- Create: `src/modules/users/dto/upsert-snapshot.dto.ts`
- Create: `src/modules/users/dto/snapshot-response.dto.ts`
- Create: `src/modules/users/users.repository.ts`
- Create: `src/modules/users/users.service.ts`
- Create: `src/modules/users/users.controller.ts`
- Create: `src/modules/users/users.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: `UsersService.upsertSnapshot(userId, displayName, avatarUrl?)` — used by Tasks 7, 8, 9

- [ ] **Step 1: Create `src/modules/users/dto/upsert-snapshot.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpsertSnapshotDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
```

- [ ] **Step 2: Create `src/modules/users/dto/snapshot-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SnapshotResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
}
```

- [ ] **Step 3: Create `src/modules/users/users.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { UserSnapshot } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(data: { userId: string; displayName: string; avatarUrl?: string | null }): Promise<UserSnapshot> {
    return this.prisma.userSnapshot.upsert({
      where: { userId: data.userId },
      create: { userId: data.userId, displayName: data.displayName, avatarUrl: data.avatarUrl },
      update: { displayName: data.displayName, avatarUrl: data.avatarUrl },
    });
  }

  findById(userId: string): Promise<UserSnapshot | null> {
    return this.prisma.userSnapshot.findUnique({ where: { userId } });
  }

  findManyByIds(userIds: string[]): Promise<UserSnapshot[]> {
    return this.prisma.userSnapshot.findMany({ where: { userId: { in: userIds } } });
  }
}
```

- [ ] **Step 4: Create `src/modules/users/users.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { UserSnapshot } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { UpsertSnapshotDto } from './dto/upsert-snapshot.dto';
import { SnapshotResponseDto } from './dto/snapshot-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async upsertSnapshot(
    userId: string,
    dto: UpsertSnapshotDto,
  ): Promise<SnapshotResponseDto> {
    const snap = await this.repo.upsert({ userId, ...dto });
    return this.toDto(snap);
  }

  /** Helper gọi từ các service khác (comments, assignees) để cache user info. */
  async upsertSnapshotRaw(
    userId: string,
    displayName: string,
    avatarUrl?: string | null,
  ): Promise<void> {
    await this.repo.upsert({ userId, displayName, avatarUrl });
  }

  findManyByIds(userIds: string[]): Promise<UserSnapshot[]> {
    return this.repo.findManyByIds(userIds);
  }

  private toDto(s: UserSnapshot): SnapshotResponseDto {
    return { userId: s.userId, displayName: s.displayName, avatarUrl: s.avatarUrl };
  }
}
```

- [ ] **Step 5: Create `src/modules/users/users.controller.ts`**

```typescript
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpsertSnapshotDto } from './dto/upsert-snapshot.dto';
import { SnapshotResponseDto } from './dto/snapshot-response.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: '1' })
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post('users/snapshot')
  @ApiOperation({ summary: 'Upsert UserSnapshot (tên, avatar) từ client' })
  @ApiResponse({ status: 200, type: SnapshotResponseDto })
  upsert(
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertSnapshotDto,
  ): Promise<SnapshotResponseDto> {
    return this.service.upsertSnapshot(userId, dto);
  }
}
```

- [ ] **Step 6: Create `src/modules/users/users.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 7: Add to `src/app.module.ts`**

```typescript
import { UsersModule } from './modules/users/users.module';
// add to imports array:
UsersModule,
```

- [ ] **Step 8: Build + Commit**

```bash
npm run build
git add -A
git commit -m "feat(users): UserSnapshot module — upsert/read user display info"
```

---

### Task 4: WebSocket Gateway (TaskGateway)

**Files:**
- Create: `src/modules/gateway/task.gateway.ts`
- Create: `src/modules/gateway/gateway.module.ts`
- Modify: `src/app.module.ts`
- Modify: `src/main.ts` (IoAdapter)

**Interfaces:**
- Consumes: `AuthService.verifyAccessToken()`, `EventEmitter2`
- Produces: `TaskGateway` — imported by Tasks 7, 8, 9, 10 to emit into rooms

- [ ] **Step 1: Create `src/modules/gateway/task.gateway.ts`**

```typescript
import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { AuthService } from '@/modules/auth/auth.service';

interface AuthSocket extends Socket {
  data: { userId: string };
}

@WebSocketGateway({
  namespace: '/tasks',
  cors: { origin: '*', credentials: true },
})
export class TaskGateway implements OnGatewayInit {
  private readonly logger = new Logger(TaskGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly auth: AuthService) {}

  afterInit(server: Server): void {
    server.use(async (socket: AuthSocket, next) => {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('UNAUTHORIZED'));
      try {
        const user = await this.auth.verifyAccessToken(token);
        socket.data.userId = user.id;
        next();
      } catch {
        next(new Error('UNAUTHORIZED'));
      }
    });
    this.logger.log('TaskGateway khởi tạo namespace /tasks');
  }

  // ── Room management ──────────────────────────────────────────────────────

  @SubscribeMessage('join-project')
  handleJoinProject(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { projectId: string },
  ): void {
    void socket.join(`project:${payload.projectId}`);
  }

  @SubscribeMessage('leave-project')
  handleLeaveProject(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { projectId: string },
  ): void {
    void socket.leave(`project:${payload.projectId}`);
  }

  @SubscribeMessage('join-task')
  handleJoinTask(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { taskId: string },
  ): void {
    void socket.join(`task:${payload.taskId}`);
  }

  @SubscribeMessage('leave-task')
  handleLeaveTask(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { taskId: string },
  ): void {
    void socket.leave(`task:${payload.taskId}`);
  }

  // ── Broadcast helpers (called by services) ───────────────────────────────

  emitToProject(projectId: string, event: string, payload: unknown): void {
    this.server.to(`project:${projectId}`).emit(event, payload);
  }

  emitToTask(taskId: string, event: string, payload: unknown): void {
    this.server.to(`task:${taskId}`).emit(event, payload);
  }

  // ── Bridge existing task/column EventEmitter events → project rooms ──────

  @OnEvent('task.created')
  onTaskCreated(payload: { projectId: string; taskId: string; task: unknown }): void {
    this.emitToProject(payload.projectId, 'task:created', payload.task);
  }

  @OnEvent('task.updated')
  onTaskUpdated(payload: { projectId: string; taskId: string; changes: unknown }): void {
    this.emitToProject(payload.projectId, 'task:updated', { taskId: payload.taskId, changes: payload.changes });
  }

  @OnEvent('task.moved')
  onTaskMoved(payload: { projectId: string; taskId: string; to: string; position?: number }): void {
    this.emitToProject(payload.projectId, 'task:moved', {
      taskId: payload.taskId,
      columnId: payload.to,
      position: payload.position,
    });
  }

  @OnEvent('task.deleted')
  onTaskDeleted(payload: { projectId: string; taskId: string }): void {
    this.emitToProject(payload.projectId, 'task:deleted', { taskId: payload.taskId });
  }

  @OnEvent('column.created')
  onColumnCreated(payload: { projectId: string; column: unknown }): void {
    this.emitToProject(payload.projectId, 'column:created', payload.column);
  }

  @OnEvent('column.updated')
  onColumnUpdated(payload: { projectId: string; columnId: string; changes: unknown }): void {
    this.emitToProject(payload.projectId, 'column:updated', { columnId: payload.columnId, changes: payload.changes });
  }

  @OnEvent('column.deleted')
  onColumnDeleted(payload: { projectId: string; columnId: string }): void {
    this.emitToProject(payload.projectId, 'column:deleted', { columnId: payload.columnId });
  }
}
```

- [ ] **Step 2: Create `src/modules/gateway/gateway.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TaskGateway } from './task.gateway';

@Module({
  imports: [AuthModule],
  providers: [TaskGateway],
  exports: [TaskGateway],
})
export class GatewayModule {}
```

- [ ] **Step 3: Modify `src/main.ts` — add IoAdapter**

Add after `NestFactory.create`:

```typescript
import { IoAdapter } from '@nestjs/platform-socket.io';
// After app is created:
app.useWebSocketAdapter(new IoAdapter(app));
```

- [ ] **Step 4: Add GatewayModule to `src/app.module.ts`**

```typescript
import { GatewayModule } from './modules/gateway/gateway.module';
// In imports:
GatewayModule,
```

- [ ] **Step 5: Patch existing services to include task/column in event payload**

In `src/modules/tasks/tasks.service.ts`, update `create()` to include task in event:

```typescript
// After creating task:
this.events.emit('task.created', {
  projectId,
  taskId: task.id,
  task: this.toDto(task),  // ← add this
  actorId: userId,
});
```

In `src/modules/columns/columns.service.ts`, update `create()` similarly:

```typescript
this.events.emit('column.created', {
  projectId,
  columnId: col.id,
  column: this.toDto(col),  // ← add this
  actorId: userId,
});
```

- [ ] **Step 6: Build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 7: Manual smoke test** — Start server, connect with wscat to `/tasks` namespace, verify join-project works:

```bash
# Terminal 1
npm run start:dev
# Terminal 2 (needs wscat: npm i -g wscat)
wscat -c "ws://localhost:3002/tasks" -H "Authorization: Bearer <token>"
# Send: {"event":"join-project","data":{"projectId":"test"}}
```

Expected: no error, socket connects.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(gateway): add Socket.io TaskGateway with project/task room management"
```

---

### Task 5: Tags Module

**Files:**
- Modify: `src/common/constants/error-codes.ts` (add TAG_* codes)
- Create: `src/modules/tags/dto/create-tag.dto.ts`
- Create: `src/modules/tags/dto/tag-response.dto.ts`
- Create: `src/modules/tags/tags.repository.ts`
- Create: `src/modules/tags/tags.service.ts`
- Create: `src/modules/tags/tags.controller.ts`
- Create: `src/modules/tags/tags.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `MembersService.assertMember(projectId, userId)`
- Produces: `TagsService` — exported for Task 11 (task detail)

- [ ] **Step 1: Add error codes to `src/common/constants/error-codes.ts`**

Add to the `ErrorCode` object:

```typescript
  TAG_NOT_FOUND: 'TAG_NOT_FOUND',
  TAG_ALREADY_ATTACHED: 'TAG_ALREADY_ATTACHED',
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
  COMMENT_FORBIDDEN: 'COMMENT_FORBIDDEN',
  CHECKLIST_NOT_FOUND: 'CHECKLIST_NOT_FOUND',
  ATTACHMENT_NOT_FOUND: 'ATTACHMENT_NOT_FOUND',
  ATTACHMENT_FORBIDDEN: 'ATTACHMENT_FORBIDDEN',
```

- [ ] **Step 2: Create `src/modules/tags/dto/create-tag.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'Bug' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: '#FF5733', description: 'Hex màu' })
  @IsHexColor()
  color!: string;
}
```

- [ ] **Step 3: Create `src/modules/tags/dto/tag-response.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() projectId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() color!: string;
  @ApiProperty() createdAt!: Date;
}
```

- [ ] **Step 4: Create `src/modules/tags/tags.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { Tag, TaskTag } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class TagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { projectId: string; name: string; color: string }): Promise<Tag> {
    return this.prisma.tag.create({ data });
  }

  findAllByProject(projectId: string): Promise<Tag[]> {
    return this.prisma.tag.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
  }

  findById(id: string): Promise<Tag | null> {
    return this.prisma.tag.findUnique({ where: { id } });
  }

  delete(id: string): Promise<void> {
    return this.prisma.tag.delete({ where: { id } }).then(() => undefined);
  }

  attachToTask(taskId: string, tagId: string): Promise<TaskTag> {
    return this.prisma.taskTag.create({ data: { taskId, tagId } });
  }

  detachFromTask(taskId: string, tagId: string): Promise<void> {
    return this.prisma.taskTag.delete({ where: { taskId_tagId: { taskId, tagId } } }).then(() => undefined);
  }

  findTaskTags(taskId: string): Promise<(TaskTag & { tag: Tag })[]> {
    return this.prisma.taskTag.findMany({
      where: { taskId },
      include: { tag: true },
    });
  }
}
```

- [ ] **Step 5: Create `src/modules/tags/tags.service.ts`**

```typescript
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Tag } from '@prisma/client';
import { MembersService } from '@/modules/members/members.service';
import { ErrorCode } from '@/common/constants/error-codes';
import { TagsRepository } from './tags.repository';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagResponseDto } from './dto/tag-response.dto';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    private readonly repo: TagsRepository,
    private readonly members: MembersService,
  ) {}

  async listProjectTags(userId: string, projectId: string): Promise<TagResponseDto[]> {
    await this.members.assertMember(projectId, userId);
    const tags = await this.repo.findAllByProject(projectId);
    return tags.map(this.toDto);
  }

  async create(userId: string, projectId: string, dto: CreateTagDto): Promise<TagResponseDto> {
    await this.members.assertMember(projectId, userId);
    const tag = await this.repo.create({ projectId, ...dto });
    this.logger.log(`Tạo tag ${tag.id} cho project ${projectId}`);
    return this.toDto(tag);
  }

  async delete(userId: string, projectId: string, tagId: string): Promise<void> {
    await this.members.assertMember(projectId, userId);
    const tag = await this.repo.findById(tagId);
    if (!tag || tag.projectId !== projectId) {
      throw new NotFoundException({ code: ErrorCode.TAG_NOT_FOUND, message: 'Không tìm thấy tag' });
    }
    await this.repo.delete(tagId);
    this.logger.log(`Xóa tag ${tagId}`);
  }

  async attachTag(userId: string, taskId: string, tagId: string, projectId: string): Promise<void> {
    await this.members.assertMember(projectId, userId);
    try {
      await this.repo.attachToTask(taskId, tagId);
    } catch {
      throw new ConflictException({ code: ErrorCode.TAG_ALREADY_ATTACHED, message: 'Tag đã được gắn' });
    }
  }

  async detachTag(userId: string, taskId: string, tagId: string, projectId: string): Promise<void> {
    await this.members.assertMember(projectId, userId);
    await this.repo.detachFromTask(taskId, tagId);
  }

  private toDto(t: Tag): TagResponseDto {
    return { id: t.id, projectId: t.projectId, name: t.name, color: t.color, createdAt: t.createdAt };
  }
}
```

- [ ] **Step 6: Create `src/modules/tags/tags.controller.ts`**

```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagResponseDto } from './dto/tag-response.dto';

@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: '1' })
export class TagsController {
  constructor(private readonly service: TagsService) {}

  @Get('projects/:projectId/tags')
  @ApiOperation({ summary: 'Danh sách tag của project' })
  @ApiResponse({ status: 200, type: [TagResponseDto] })
  list(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ): Promise<TagResponseDto[]> {
    return this.service.listProjectTags(userId, projectId);
  }

  @Post('projects/:projectId/tags')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo tag mới cho project' })
  @ApiResponse({ status: 201, type: TagResponseDto })
  create(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTagDto,
  ): Promise<TagResponseDto> {
    return this.service.create(userId, projectId, dto);
  }

  @Delete('projects/:projectId/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa tag' })
  delete(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('tagId') tagId: string,
  ): Promise<void> {
    return this.service.delete(userId, projectId, tagId);
  }

  @Post('tasks/:taskId/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Gắn tag vào task' })
  attachTag(
    @CurrentUser('id') userId: string,
    @Param('taskId') taskId: string,
    @Param('tagId') tagId: string,
  ): Promise<void> {
    // projectId resolved inside service via task lookup
    return this.service.attachTag(userId, taskId, tagId, '');
  }
}
```

> **Note:** `attachTag` / `detachTag` endpoints need `projectId` for membership check — refactor `TagsService.attachTag` to accept `taskId` and lookup task.projectId internally, injecting `TasksService`.

- [ ] **Step 7: Create `src/modules/tags/tags.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { MembersModule } from '@/modules/members/members.module';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TagsRepository } from './tags.repository';

@Module({
  imports: [MembersModule],
  controllers: [TagsController],
  providers: [TagsService, TagsRepository],
  exports: [TagsService],
})
export class TagsModule {}
```

- [ ] **Step 8: Add to `src/app.module.ts` + Build + Commit**

```bash
npm run build
git add -A
git commit -m "feat(tags): Tags module — CRUD project tags + attach/detach to tasks"
```

---

### Task 6: Comments Module

**Files:**
- Create: `src/modules/comments/dto/create-comment.dto.ts`
- Create: `src/modules/comments/dto/update-comment.dto.ts`
- Create: `src/modules/comments/dto/comment-response.dto.ts`
- Create: `src/modules/comments/comments.repository.ts`
- Create: `src/modules/comments/comments.service.ts`
- Create: `src/modules/comments/comments.controller.ts`
- Create: `src/modules/comments/comments.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `MembersService`, `TaskGateway.emitToTask()`, `UsersService.upsertSnapshotRaw()`
- Produces: `CommentsService` — used by Task 11 (task detail)

- [ ] **Step 1: Create `src/modules/comments/dto/create-comment.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  @ApiProperty({ description: 'Tên hiển thị của người comment (để cache UserSnapshot)' })
  @IsString()
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
```

- [ ] **Step 2: Create `src/modules/comments/dto/update-comment.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}
```

- [ ] **Step 3: Create `src/modules/comments/dto/comment-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() taskId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() content!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
```

- [ ] **Step 4: Create `src/modules/comments/comments.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { TaskComment, UserSnapshot } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

export type CommentWithSnapshot = TaskComment & { author: UserSnapshot | null };

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { taskId: string; userId: string; content: string }): Promise<TaskComment> {
    return this.prisma.taskComment.create({ data });
  }

  findById(id: string): Promise<TaskComment | null> {
    return this.prisma.taskComment.findFirst({ where: { id, deletedAt: null } });
  }

  findByTask(taskId: string, limit = 50): Promise<CommentWithSnapshot[]> {
    return this.prisma.taskComment.findMany({
      where: { taskId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { author: { model: 'UserSnapshot' } as never },
    }) as Promise<CommentWithSnapshot[]>;
  }

  update(id: string, content: string): Promise<TaskComment> {
    return this.prisma.taskComment.update({ where: { id }, data: { content } });
  }

  softDelete(id: string): Promise<void> {
    return this.prisma.taskComment.update({ where: { id }, data: { deletedAt: new Date() } }).then(() => undefined);
  }
}
```

> **Note on Prisma relation:** `TaskComment` doesn't have a direct Prisma relation to `UserSnapshot` (different id type). In `findByTask`, fetch comments then batch-load snapshots:

- [ ] **Step 5: Correct `findByTask` (no Prisma include needed)**

Replace `findByTask` in the repository with:

```typescript
  async findByTask(taskId: string, limit = 50): Promise<TaskComment[]> {
    return this.prisma.taskComment.findMany({
      where: { taskId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
```

- [ ] **Step 6: Create `src/modules/comments/comments.service.ts`**

```typescript
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TaskComment } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MembersService } from '@/modules/members/members.service';
import { UsersService } from '@/modules/users/users.service';
import { TaskGateway } from '@/modules/gateway/task.gateway';
import { ErrorCode } from '@/common/constants/error-codes';
import { CommentsRepository } from './comments.repository';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly repo: CommentsRepository,
    private readonly members: MembersService,
    private readonly users: UsersService,
    private readonly gateway: TaskGateway,
    private readonly events: EventEmitter2,
  ) {}

  async create(
    userId: string,
    taskId: string,
    projectId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    await this.members.assertMember(projectId, userId);
    await this.users.upsertSnapshotRaw(userId, dto.displayName, dto.avatarUrl);
    const comment = await this.repo.create({ taskId, userId, content: dto.content });
    this.logger.log(`Thêm comment ${comment.id} vào task ${taskId}`);
    const responseDto = this.toDto(comment, dto.displayName, dto.avatarUrl);
    this.gateway.emitToTask(taskId, 'comment:created', responseDto);
    this.events.emit('activity.log', {
      projectId, taskId, actorId: userId, action: 'comment.created',
      metadata: { commentId: comment.id },
    });
    return responseDto;
  }

  async update(
    userId: string,
    commentId: string,
    taskId: string,
    projectId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    await this.members.assertMember(projectId, userId);
    const comment = await this.getOrThrow(commentId);
    if (comment.userId !== userId) {
      throw new ForbiddenException({ code: ErrorCode.COMMENT_FORBIDDEN, message: 'Không có quyền sửa comment này' });
    }
    const updated = await this.repo.update(commentId, dto.content);
    const snap = await this.users.findManyByIds([userId]);
    const responseDto = this.toDto(updated, snap[0]?.displayName ?? '', snap[0]?.avatarUrl);
    this.gateway.emitToTask(taskId, 'comment:updated', { commentId, content: dto.content });
    return responseDto;
  }

  async remove(userId: string, commentId: string, taskId: string, projectId: string): Promise<void> {
    await this.members.assertMember(projectId, userId);
    const comment = await this.getOrThrow(commentId);
    if (comment.userId !== userId) {
      throw new ForbiddenException({ code: ErrorCode.COMMENT_FORBIDDEN, message: 'Không có quyền xóa comment này' });
    }
    await this.repo.softDelete(commentId);
    this.gateway.emitToTask(taskId, 'comment:deleted', { commentId });
  }

  async findByTask(taskId: string, projectId: string, userId: string): Promise<CommentResponseDto[]> {
    await this.members.assertMember(projectId, userId);
    const comments = await this.repo.findByTask(taskId);
    const userIds = [...new Set(comments.map((c) => c.userId))];
    const snapshots = await this.users.findManyByIds(userIds);
    const snapMap = new Map(snapshots.map((s) => [s.userId, s]));
    return comments.map((c) => {
      const snap = snapMap.get(c.userId);
      return this.toDto(c, snap?.displayName ?? c.userId, snap?.avatarUrl);
    });
  }

  private async getOrThrow(id: string): Promise<TaskComment> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException({ code: ErrorCode.COMMENT_NOT_FOUND, message: 'Không tìm thấy comment' });
    return c;
  }

  private toDto(c: TaskComment, displayName: string, avatarUrl?: string | null): CommentResponseDto {
    return {
      id: c.id, taskId: c.taskId, userId: c.userId, content: c.content,
      displayName, avatarUrl, createdAt: c.createdAt, updatedAt: c.updatedAt,
    };
  }
}
```

- [ ] **Step 7: Create `src/modules/comments/comments.controller.ts`**

```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: '1' })
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get('projects/:projectId/tasks/:taskId/comments')
  @ApiOperation({ summary: 'Lấy danh sách comment của task' })
  @ApiResponse({ status: 200, type: [CommentResponseDto] })
  list(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<CommentResponseDto[]> {
    return this.service.findByTask(taskId, projectId, userId);
  }

  @Post('projects/:projectId/tasks/:taskId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm comment' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  create(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.service.create(userId, taskId, projectId, dto);
  }

  @Patch('projects/:projectId/tasks/:taskId/comments/:commentId')
  @ApiOperation({ summary: 'Sửa comment' })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  update(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.service.update(userId, commentId, taskId, projectId, dto);
  }

  @Delete('projects/:projectId/tasks/:taskId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa comment' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    return this.service.remove(userId, commentId, taskId, projectId);
  }
}
```

- [ ] **Step 8: Create `src/modules/comments/comments.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { MembersModule } from '@/modules/members/members.module';
import { UsersModule } from '@/modules/users/users.module';
import { GatewayModule } from '@/modules/gateway/gateway.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './comments.repository';

@Module({
  imports: [MembersModule, UsersModule, GatewayModule],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsRepository],
  exports: [CommentsService],
})
export class CommentsModule {}
```

- [ ] **Step 9: Build + add to app.module.ts + Commit**

```bash
npm run build
git add -A
git commit -m "feat(comments): Comments module — CRUD with real-time Socket.io broadcast"
```

---

### Task 7: Checklists Module

**Files:**
- Create: `src/modules/checklists/dto/create-checklist-item.dto.ts`
- Create: `src/modules/checklists/dto/update-checklist-item.dto.ts`
- Create: `src/modules/checklists/dto/checklist-item-response.dto.ts`
- Create: `src/modules/checklists/checklists.repository.ts`
- Create: `src/modules/checklists/checklists.service.ts`
- Create: `src/modules/checklists/checklists.controller.ts`
- Create: `src/modules/checklists/checklists.module.ts`

**Interfaces:**
- Consumes: `MembersService`, `TaskGateway.emitToTask()`
- Produces: `ChecklistsService` — used by Task 11

- [ ] **Step 1: Create `src/modules/checklists/dto/create-checklist-item.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChecklistItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content!: string;
}
```

- [ ] **Step 2: Create `src/modules/checklists/dto/update-checklist-item.dto.ts`**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateChecklistItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}
```

- [ ] **Step 3: Create `src/modules/checklists/dto/checklist-item-response.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ChecklistItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() taskId!: string;
  @ApiProperty() content!: string;
  @ApiProperty() isDone!: boolean;
  @ApiProperty() position!: number;
  @ApiProperty() createdAt!: Date;
}
```

- [ ] **Step 4: Create `src/modules/checklists/checklists.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { TaskChecklist } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class ChecklistsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async maxPosition(taskId: string): Promise<number> {
    const top = await this.prisma.taskChecklist.findFirst({
      where: { taskId }, orderBy: { position: 'desc' }, select: { position: true },
    });
    return top?.position ?? 0;
  }

  create(data: { taskId: string; content: string; position: number }): Promise<TaskChecklist> {
    return this.prisma.taskChecklist.create({ data });
  }

  findByTask(taskId: string): Promise<TaskChecklist[]> {
    return this.prisma.taskChecklist.findMany({ where: { taskId }, orderBy: { position: 'asc' } });
  }

  findById(id: string): Promise<TaskChecklist | null> {
    return this.prisma.taskChecklist.findUnique({ where: { id } });
  }

  update(id: string, data: { content?: string; isDone?: boolean }): Promise<TaskChecklist> {
    return this.prisma.taskChecklist.update({ where: { id }, data });
  }

  delete(id: string): Promise<void> {
    return this.prisma.taskChecklist.delete({ where: { id } }).then(() => undefined);
  }
}
```

- [ ] **Step 5: Create `src/modules/checklists/checklists.service.ts`**

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TaskChecklist } from '@prisma/client';
import { MembersService } from '@/modules/members/members.service';
import { TaskGateway } from '@/modules/gateway/task.gateway';
import { ErrorCode } from '@/common/constants/error-codes';
import { ChecklistsRepository } from './checklists.repository';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { ChecklistItemResponseDto } from './dto/checklist-item-response.dto';

@Injectable()
export class ChecklistsService {
  private readonly logger = new Logger(ChecklistsService.name);

  constructor(
    private readonly repo: ChecklistsRepository,
    private readonly members: MembersService,
    private readonly gateway: TaskGateway,
  ) {}

  async addItem(
    userId: string,
    taskId: string,
    projectId: string,
    dto: CreateChecklistItemDto,
  ): Promise<ChecklistItemResponseDto> {
    await this.members.assertMember(projectId, userId);
    const position = (await this.repo.maxPosition(taskId)) + 1000;
    const item = await this.repo.create({ taskId, content: dto.content, position });
    this.logger.log(`Thêm checklist item ${item.id} vào task ${taskId}`);
    const dto_ = this.toDto(item);
    this.gateway.emitToTask(taskId, 'checklist:added', dto_);
    return dto_;
  }

  async updateItem(
    userId: string,
    itemId: string,
    taskId: string,
    projectId: string,
    dto: UpdateChecklistItemDto,
  ): Promise<ChecklistItemResponseDto> {
    await this.members.assertMember(projectId, userId);
    const item = await this.getOrThrow(itemId);
    const updated = await this.repo.update(itemId, dto);
    const responseDto = this.toDto(updated);
    if (dto.isDone !== undefined) {
      this.gateway.emitToTask(taskId, 'checklist:toggled', { itemId, isDone: updated.isDone });
    } else {
      this.gateway.emitToTask(taskId, 'checklist:updated', responseDto);
    }
    return responseDto;
  }

  async removeItem(userId: string, itemId: string, taskId: string, projectId: string): Promise<void> {
    await this.members.assertMember(projectId, userId);
    await this.getOrThrow(itemId);
    await this.repo.delete(itemId);
    this.gateway.emitToTask(taskId, 'checklist:deleted', { itemId });
  }

  findByTask(taskId: string): Promise<TaskChecklist[]> {
    return this.repo.findByTask(taskId);
  }

  private async getOrThrow(id: string): Promise<TaskChecklist> {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException({ code: ErrorCode.CHECKLIST_NOT_FOUND, message: 'Không tìm thấy mục kiểm tra' });
    return item;
  }

  private toDto(i: TaskChecklist): ChecklistItemResponseDto {
    return { id: i.id, taskId: i.taskId, content: i.content, isDone: i.isDone, position: i.position, createdAt: i.createdAt };
  }
}
```

- [ ] **Step 6: Create controller + module** (same pattern as CommentsController/Module, path: `projects/:projectId/tasks/:taskId/checklists/:itemId?`)

- [ ] **Step 7: Add to app.module + Build + Commit**

```bash
npm run build
git add -A
git commit -m "feat(checklists): Checklists module — CRUD with real-time toggle broadcast"
```

---

### Task 8: Assignees Module

**Files:**
- Create: `src/modules/assignees/dto/add-assignee.dto.ts`
- Create: `src/modules/assignees/dto/assignee-response.dto.ts`
- Create: `src/modules/assignees/assignees.repository.ts`
- Create: `src/modules/assignees/assignees.service.ts`
- Create: `src/modules/assignees/assignees.controller.ts`
- Create: `src/modules/assignees/assignees.module.ts`

- [ ] **Step 1: Create `src/modules/assignees/dto/add-assignee.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class AddAssigneeDto {
  @ApiProperty({ description: 'userId của người được giao' })
  @IsString()
  targetUserId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
```

- [ ] **Step 2: Create `src/modules/assignees/dto/assignee-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssigneeResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
  @ApiProperty() assignedAt!: Date;
}
```

- [ ] **Step 3: Create `src/modules/assignees/assignees.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { TaskAssignee } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AssigneesRepository {
  constructor(private readonly prisma: PrismaService) {}

  add(taskId: string, userId: string, assignedBy: string): Promise<TaskAssignee> {
    return this.prisma.taskAssignee.create({ data: { taskId, userId, assignedBy } });
  }

  remove(taskId: string, userId: string): Promise<void> {
    return this.prisma.taskAssignee.delete({ where: { taskId_userId: { taskId, userId } } }).then(() => undefined);
  }

  findByTask(taskId: string): Promise<TaskAssignee[]> {
    return this.prisma.taskAssignee.findMany({ where: { taskId }, orderBy: { assignedAt: 'asc' } });
  }
}
```

- [ ] **Step 4: Create `src/modules/assignees/assignees.service.ts`**

```typescript
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { MembersService } from '@/modules/members/members.service';
import { UsersService } from '@/modules/users/users.service';
import { TaskGateway } from '@/modules/gateway/task.gateway';
import { AssigneesRepository } from './assignees.repository';
import { AddAssigneeDto } from './dto/add-assignee.dto';
import { AssigneeResponseDto } from './dto/assignee-response.dto';

@Injectable()
export class AssigneesService {
  private readonly logger = new Logger(AssigneesService.name);

  constructor(
    private readonly repo: AssigneesRepository,
    private readonly members: MembersService,
    private readonly users: UsersService,
    private readonly gateway: TaskGateway,
  ) {}

  async addAssignee(
    actorId: string,
    taskId: string,
    projectId: string,
    dto: AddAssigneeDto,
  ): Promise<AssigneeResponseDto> {
    await this.members.assertMember(projectId, actorId);
    await this.members.assertMember(projectId, dto.targetUserId);
    await this.users.upsertSnapshotRaw(dto.targetUserId, dto.displayName, dto.avatarUrl);
    let assignee;
    try {
      assignee = await this.repo.add(taskId, dto.targetUserId, actorId);
    } catch {
      throw new ConflictException({ code: 'ASSIGNEE_ALREADY_EXISTS', message: 'Người này đã được giao task' });
    }
    const responseDto: AssigneeResponseDto = {
      userId: dto.targetUserId, displayName: dto.displayName,
      avatarUrl: dto.avatarUrl, assignedAt: assignee.assignedAt,
    };
    this.gateway.emitToTask(taskId, 'assignee:added', responseDto);
    this.logger.log(`Giao task ${taskId} cho ${dto.targetUserId}`);
    return responseDto;
  }

  async removeAssignee(actorId: string, taskId: string, targetUserId: string, projectId: string): Promise<void> {
    await this.members.assertMember(projectId, actorId);
    await this.repo.remove(taskId, targetUserId);
    this.gateway.emitToTask(taskId, 'assignee:removed', { userId: targetUserId });
  }

  async findByTask(taskId: string, projectId: string, userId: string): Promise<AssigneeResponseDto[]> {
    await this.members.assertMember(projectId, userId);
    const assignees = await this.repo.findByTask(taskId);
    const userIds = assignees.map((a) => a.userId);
    const snaps = await this.users.findManyByIds(userIds);
    const snapMap = new Map(snaps.map((s) => [s.userId, s]));
    return assignees.map((a) => {
      const snap = snapMap.get(a.userId);
      return { userId: a.userId, displayName: snap?.displayName ?? a.userId, avatarUrl: snap?.avatarUrl, assignedAt: a.assignedAt };
    });
  }
}
```

- [ ] **Step 5: Create controller (POST/DELETE `projects/:pid/tasks/:tid/assignees/:uid`) + module**

- [ ] **Step 6: Add to app.module + Build + Commit**

```bash
git commit -m "feat(assignees): Assignees module — add/remove task assignees with real-time"
```

---

### Task 9: Attachments Module (S3 presigned)

**Files:**
- Modify: `prisma/schema.prisma` (add `TaskAttachment` model)
- Create: prisma migration
- Create: `src/modules/attachments/dto/presign-attachment.dto.ts`
- Create: `src/modules/attachments/dto/confirm-attachment.dto.ts`
- Create: `src/modules/attachments/dto/attachment-response.dto.ts`
- Create: `src/modules/attachments/attachments.repository.ts`
- Create: `src/modules/attachments/attachments.service.ts`
- Create: `src/modules/attachments/attachments.controller.ts`
- Create: `src/modules/attachments/attachments.module.ts`

**Interfaces:**
- Consumes: `StorageService` (Task 2), `MembersService`, `TaskGateway`
- Produces: `AttachmentsService` — used by Task 11

- [ ] **Step 1: Add `TaskAttachment` to `prisma/schema.prisma`**

Add after the `Task` model's closing brace:

```prisma
model TaskAttachment {
  id          String   @id @default(cuid())
  taskId      String
  uploadedBy  String
  fileName    String
  mimeType    String
  fileSize    Int
  s3Key       String   @unique
  isConfirmed Boolean  @default(false)
  createdAt   DateTime @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@map("task_attachments")
}
```

Add `attachments TaskAttachment[]` to `Task` model's relations.

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-task-attachment
```

Expected: migration file created in `prisma/migrations/`, `TaskAttachment` table created.

- [ ] **Step 3: Create `src/modules/attachments/dto/presign-attachment.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class PresignAttachmentDto {
  @ApiProperty({ example: 'design.pdf' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({ example: 1024000, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB max
  fileSize!: number;
}
```

- [ ] **Step 4: Create `src/modules/attachments/dto/confirm-attachment.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmAttachmentDto {
  @ApiProperty()
  @IsString()
  attachmentId!: string;
}
```

- [ ] **Step 5: Create `src/modules/attachments/dto/attachment-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttachmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() taskId!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() fileSize!: number;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() downloadUrl?: string;
}

export class PresignResponseDto {
  @ApiProperty() attachmentId!: string;
  @ApiProperty() uploadUrl!: string;
}
```

- [ ] **Step 6: Create `src/modules/attachments/attachments.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { TaskAttachment } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    taskId: string; uploadedBy: string; fileName: string;
    mimeType: string; fileSize: number; s3Key: string;
  }): Promise<TaskAttachment> {
    return this.prisma.taskAttachment.create({ data });
  }

  confirm(id: string): Promise<TaskAttachment> {
    return this.prisma.taskAttachment.update({ where: { id }, data: { isConfirmed: true } });
  }

  findById(id: string): Promise<TaskAttachment | null> {
    return this.prisma.taskAttachment.findUnique({ where: { id } });
  }

  findConfirmedByTask(taskId: string): Promise<TaskAttachment[]> {
    return this.prisma.taskAttachment.findMany({
      where: { taskId, isConfirmed: true }, orderBy: { createdAt: 'asc' },
    });
  }

  delete(id: string): Promise<TaskAttachment> {
    return this.prisma.taskAttachment.delete({ where: { id } });
  }

  deleteUnconfirmedOlderThan(date: Date): Promise<{ count: number }> {
    return this.prisma.taskAttachment.deleteMany({
      where: { isConfirmed: false, createdAt: { lt: date } },
    });
  }
}
```

- [ ] **Step 7: Create `src/modules/attachments/attachments.service.ts`**

```typescript
import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { APP_CONFIG } from '@/config/configuration';
import type { AppConfig } from '@/config/configuration';
import { MembersService } from '@/modules/members/members.service';
import { StorageService } from '@/modules/storage/storage.service';
import { TaskGateway } from '@/modules/gateway/task.gateway';
import { ErrorCode } from '@/common/constants/error-codes';
import { AttachmentsRepository } from './attachments.repository';
import { PresignAttachmentDto } from './dto/presign-attachment.dto';
import { ConfirmAttachmentDto } from './dto/confirm-attachment.dto';
import { AttachmentResponseDto, PresignResponseDto } from './dto/attachment-response.dto';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly repo: AttachmentsRepository,
    private readonly members: MembersService,
    private readonly storage: StorageService,
    private readonly gateway: TaskGateway,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async presign(userId: string, taskId: string, projectId: string, dto: PresignAttachmentDto): Promise<PresignResponseDto> {
    await this.members.assertMember(projectId, userId);
    const ext = dto.fileName.split('.').pop() ?? 'bin';
    const s3Key = `tasks/${taskId}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.storage.createUploadUrl({
      bucket: this.cfg.s3.bucketAttachments,
      key: s3Key,
      contentType: dto.mimeType,
      expiresIn: this.cfg.s3.uploadUrlTtl,
    });
    const attachment = await this.repo.create({
      taskId, uploadedBy: userId, fileName: dto.fileName,
      mimeType: dto.mimeType, fileSize: dto.fileSize, s3Key,
    });
    return { attachmentId: attachment.id, uploadUrl };
  }

  async confirm(userId: string, taskId: string, projectId: string, dto: ConfirmAttachmentDto): Promise<AttachmentResponseDto> {
    await this.members.assertMember(projectId, userId);
    const attachment = await this.repo.findById(dto.attachmentId);
    if (!attachment || attachment.taskId !== taskId) {
      throw new NotFoundException({ code: ErrorCode.ATTACHMENT_NOT_FOUND, message: 'Không tìm thấy attachment' });
    }
    if (attachment.uploadedBy !== userId) {
      throw new ForbiddenException({ code: ErrorCode.ATTACHMENT_FORBIDDEN, message: 'Không có quyền confirm attachment này' });
    }
    const confirmed = await this.repo.confirm(dto.attachmentId);
    this.logger.log(`Confirm attachment ${confirmed.id} cho task ${taskId}`);
    const downloadUrl = await this.storage.createDownloadUrl({
      bucket: this.cfg.s3.bucketAttachments,
      key: confirmed.s3Key,
      expiresIn: this.cfg.s3.downloadUrlTtl,
      windowSeconds: this.cfg.s3.downloadUrlWindowSeconds,
    });
    const responseDto = this.toDto(confirmed, downloadUrl);
    this.gateway.emitToTask(taskId, 'attachment:added', responseDto);
    return responseDto;
  }

  async remove(userId: string, attachmentId: string, taskId: string, projectId: string): Promise<void> {
    await this.members.assertMember(projectId, userId);
    const attachment = await this.repo.findById(attachmentId);
    if (!attachment || attachment.taskId !== taskId) {
      throw new NotFoundException({ code: ErrorCode.ATTACHMENT_NOT_FOUND, message: 'Không tìm thấy attachment' });
    }
    if (attachment.uploadedBy !== userId) {
      throw new ForbiddenException({ code: ErrorCode.ATTACHMENT_FORBIDDEN, message: 'Không có quyền xóa attachment này' });
    }
    await this.repo.delete(attachmentId);
    await this.storage.deleteObject(this.cfg.s3.bucketAttachments, attachment.s3Key);
    this.gateway.emitToTask(taskId, 'attachment:deleted', { attachmentId });
    this.logger.log(`Xóa attachment ${attachmentId}`);
  }

  async findByTask(taskId: string, projectId: string, userId: string): Promise<AttachmentResponseDto[]> {
    await this.members.assertMember(projectId, userId);
    const attachments = await this.repo.findConfirmedByTask(taskId);
    return Promise.all(
      attachments.map(async (a) => {
        const downloadUrl = await this.storage.createDownloadUrl({
          bucket: this.cfg.s3.bucketAttachments,
          key: a.s3Key,
          expiresIn: this.cfg.s3.downloadUrlTtl,
          windowSeconds: this.cfg.s3.downloadUrlWindowSeconds,
        });
        return this.toDto(a, downloadUrl);
      }),
    );
  }

  private toDto(a: { id: string; taskId: string; fileName: string; mimeType: string; fileSize: number; createdAt: Date }, downloadUrl?: string): AttachmentResponseDto {
    return { id: a.id, taskId: a.taskId, fileName: a.fileName, mimeType: a.mimeType, fileSize: a.fileSize, createdAt: a.createdAt, downloadUrl };
  }
}
```

- [ ] **Step 8: Create controller (POST presign, POST confirm, DELETE, GET list) + module**

Path pattern: `projects/:projectId/tasks/:taskId/attachments`

- [ ] **Step 9: Add StorageModule + GatewayModule to AttachmentsModule imports. Add AttachmentsModule to app.module**

- [ ] **Step 10: Build + Commit**

```bash
npm run build
git add -A
git commit -m "feat(attachments): Attachments module — S3 presigned upload + confirm + real-time"
```

---

### Task 10: ActivityLog Module

**Files:**
- Create: `src/modules/activities/dto/activity-response.dto.ts`
- Create: `src/modules/activities/activities.repository.ts`
- Create: `src/modules/activities/activities-write.service.ts`
- Create: `src/modules/activities/activities-read.service.ts`
- Create: `src/modules/activities/activities.controller.ts`
- Create: `src/modules/activities/activities.module.ts`

**Interfaces:**
- Consumes: `EventEmitter2` event `'activity.log'` emitted by CommentsService + future services
- Produces: `GET /projects/:pid/activities` — used by FE ActivitySection

- [ ] **Step 1: Create `src/modules/activities/dto/activity-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() projectId!: string;
  @ApiPropertyOptional() taskId?: string | null;
  @ApiProperty() actorId!: string;
  @ApiProperty() actorName!: string;
  @ApiPropertyOptional() actorAvatar?: string | null;
  @ApiProperty() action!: string;
  @ApiPropertyOptional() metadata?: Record<string, unknown> | null;
  @ApiProperty() createdAt!: Date;
}
```

- [ ] **Step 2: Create `src/modules/activities/activities.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { ActivityLog } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class ActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { projectId: string; taskId?: string; actorId: string; action: string; metadata?: Record<string, unknown> }): Promise<ActivityLog> {
    return this.prisma.activityLog.create({ data: { ...data, metadata: data.metadata as never } });
  }

  findByProject(projectId: string, limit = 50): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findByTask(taskId: string, limit = 30): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
```

- [ ] **Step 3: Create `src/modules/activities/activities-write.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UsersService } from '@/modules/users/users.service';
import { ActivitiesRepository } from './activities.repository';

interface ActivityLogPayload {
  projectId: string;
  taskId?: string;
  actorId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivitiesWriteService {
  private readonly logger = new Logger(ActivitiesWriteService.name);

  constructor(
    private readonly repo: ActivitiesRepository,
    private readonly users: UsersService,
  ) {}

  @OnEvent('activity.log')
  async handleActivityLog(payload: ActivityLogPayload): Promise<void> {
    try {
      await this.repo.create(payload);
    } catch (err) {
      // Activity log failure không được crash caller
      this.logger.error('Ghi activity log thất bại', (err as Error).stack, payload);
    }
  }

  // Auto-log task events from existing EventEmitter emissions
  @OnEvent('task.created')
  logTaskCreated(p: { projectId: string; taskId: string; actorId: string }): void {
    void this.repo.create({ projectId: p.projectId, taskId: p.taskId, actorId: p.actorId, action: 'task.created' });
  }

  @OnEvent('task.moved')
  logTaskMoved(p: { projectId: string; taskId: string; actorId: string; from: string; to: string }): void {
    void this.repo.create({ projectId: p.projectId, taskId: p.taskId, actorId: p.actorId, action: 'task.moved', metadata: { from: p.from, to: p.to } });
  }

  @OnEvent('task.deleted')
  logTaskDeleted(p: { projectId: string; taskId: string; actorId: string }): void {
    void this.repo.create({ projectId: p.projectId, taskId: p.taskId, actorId: p.actorId, action: 'task.deleted' });
  }
}
```

- [ ] **Step 4: Create `src/modules/activities/activities-read.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { ActivitiesRepository } from './activities.repository';
import { ActivityResponseDto } from './dto/activity-response.dto';
import type { ActivityLog } from '@prisma/client';

@Injectable()
export class ActivitiesReadService {
  constructor(
    private readonly repo: ActivitiesRepository,
    private readonly users: UsersService,
  ) {}

  async findByProject(projectId: string): Promise<ActivityResponseDto[]> {
    const logs = await this.repo.findByProject(projectId);
    return this.enrich(logs);
  }

  async findByTask(taskId: string): Promise<ActivityResponseDto[]> {
    const logs = await this.repo.findByTask(taskId);
    return this.enrich(logs);
  }

  private async enrich(logs: ActivityLog[]): Promise<ActivityResponseDto[]> {
    const actorIds = [...new Set(logs.map((l) => l.actorId))];
    const snaps = await this.users.findManyByIds(actorIds);
    const snapMap = new Map(snaps.map((s) => [s.userId, s]));
    return logs.map((l) => {
      const snap = snapMap.get(l.actorId);
      return {
        id: l.id, projectId: l.projectId, taskId: l.taskId, actorId: l.actorId,
        actorName: snap?.displayName ?? l.actorId, actorAvatar: snap?.avatarUrl,
        action: l.action, metadata: l.metadata as Record<string, unknown> | null,
        createdAt: l.createdAt,
      };
    });
  }
}
```

- [ ] **Step 5: Create controller**

```typescript
// GET /projects/:projectId/activities
// GET /projects/:projectId/tasks/:taskId/activities
```

- [ ] **Step 6: Create module + add to app.module + Build + Commit**

```bash
git commit -m "feat(activities): ActivityLog module — write on events, read via REST"
```

---

### Task 11: Task Detail GET endpoint

**Files:**
- Modify: `src/modules/tasks/tasks.controller.ts`
- Modify: `src/modules/tasks/tasks.service.ts`
- Modify: `src/modules/tasks/tasks.repository.ts`
- Create: `src/modules/tasks/dto/task-detail-response.dto.ts`
- Modify: `src/modules/tasks/tasks.module.ts`

**Interfaces:**
- Consumes: All feature services from Tasks 5–10
- Produces: `GET /tasks/:id/detail` — main endpoint FE Task Detail modal calls

- [ ] **Step 1: Create `src/modules/tasks/dto/task-detail-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TagResponseDto } from '@/modules/tags/dto/tag-response.dto';
import { CommentResponseDto } from '@/modules/comments/dto/comment-response.dto';
import { ChecklistItemResponseDto } from '@/modules/checklists/dto/checklist-item-response.dto';
import { AssigneeResponseDto } from '@/modules/assignees/dto/assignee-response.dto';
import { AttachmentResponseDto } from '@/modules/attachments/dto/attachment-response.dto';
import { ActivityResponseDto } from '@/modules/activities/dto/activity-response.dto';

export class TaskDetailResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() projectId!: string;
  @ApiProperty() columnId!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() position!: number;
  @ApiProperty() isPinned!: boolean;
  @ApiPropertyOptional() priority?: string | null;
  @ApiPropertyOptional() dueDate?: Date | null;
  @ApiPropertyOptional() completedAt?: Date | null;
  @ApiProperty() createdBy!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: [TagResponseDto] }) tags!: TagResponseDto[];
  @ApiProperty({ type: [AssigneeResponseDto] }) assignees!: AssigneeResponseDto[];
  @ApiProperty({ type: [ChecklistItemResponseDto] }) checklist!: ChecklistItemResponseDto[];
  @ApiProperty({ type: [CommentResponseDto] }) comments!: CommentResponseDto[];
  @ApiProperty({ type: [AttachmentResponseDto] }) attachments!: AttachmentResponseDto[];
  @ApiProperty({ type: [ActivityResponseDto] }) activities!: ActivityResponseDto[];
}
```

- [ ] **Step 2: Add `findWithTags` to `src/modules/tasks/tasks.repository.ts`**

```typescript
import { Prisma } from '@prisma/client';

// Add at end of TasksRepository class:
findWithTags(id: string) {
  return this.prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: {
      tags: { include: { tag: true } },
    },
  });
}
```

- [ ] **Step 3: Add `getDetail` to `src/modules/tasks/tasks.service.ts`**

```typescript
// Inject in constructor (add to module too):
// private readonly commentsService: CommentsService
// private readonly checklistsService: ChecklistsService
// private readonly assigneesService: AssigneesService
// private readonly attachmentsService: AttachmentsService
// private readonly activitiesReadService: ActivitiesReadService

async getDetail(userId: string, taskId: string): Promise<TaskDetailResponseDto> {
  const task = await this.getOrThrow(taskId);
  await this.members.assertMember(task.projectId, userId);

  const taskWithTags = await this.repo.findWithTags(taskId);
  const tags = (taskWithTags?.tags ?? []).map((tt) => ({
    id: tt.tag.id, projectId: tt.tag.projectId, name: tt.tag.name,
    color: tt.tag.color, createdAt: tt.tag.createdAt,
  }));

  const [comments, checklist, assignees, attachments, activities] = await Promise.all([
    this.commentsService.findByTask(taskId, task.projectId, userId),
    this.checklistsService.findByTask(taskId),
    this.assigneesService.findByTask(taskId, task.projectId, userId),
    this.attachmentsService.findByTask(taskId, task.projectId, userId),
    this.activitiesReadService.findByTask(taskId),
  ]);

  return {
    id: task.id, projectId: task.projectId, columnId: task.columnId,
    title: task.title, description: task.description, position: task.position,
    isPinned: task.isPinned, priority: task.priority, dueDate: task.dueDate,
    completedAt: task.completedAt, createdBy: task.createdBy, createdAt: task.createdAt,
    tags, assignees, checklist: checklist.map((c) => ({
      id: c.id, taskId: c.taskId, content: c.content, isDone: c.isDone,
      position: c.position, createdAt: c.createdAt,
    })), comments, attachments, activities,
  };
}
```

- [ ] **Step 4: Add endpoint to `src/modules/tasks/tasks.controller.ts`**

```typescript
@Get('tasks/:id/detail')
@ApiOperation({ summary: 'Lấy task detail đầy đủ (tags, assignees, checklist, comments, attachments, activities)' })
@ApiResponse({ status: 200, type: TaskDetailResponseDto })
getDetail(
  @CurrentUser('id') userId: string,
  @Param('id') id: string,
): Promise<TaskDetailResponseDto> {
  return this.service.getDetail(userId, id);
}
```

- [ ] **Step 5: Update `src/modules/tasks/tasks.module.ts`** to import CommentsModule, ChecklistsModule, AssigneesModule, AttachmentsModule, ActivitiesModule.

- [ ] **Step 6: Build + Commit**

```bash
npm run build
git add -A
git commit -m "feat(tasks): add GET /tasks/:id/detail — full task data including related entities"
```

---

### Task 12: Reports Module

**Files:**
- Create: `src/modules/reports/dto/project-stats-response.dto.ts`
- Create: `src/modules/reports/dto/user-stats-response.dto.ts`
- Create: `src/modules/reports/reports.service.ts`
- Create: `src/modules/reports/reports.controller.ts`
- Create: `src/modules/reports/reports.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create `src/modules/reports/dto/project-stats-response.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class DayBarDto {
  @ApiProperty() label!: string;   // 'T2', 'T3'…
  @ApiProperty() date!: string;    // YYYY-MM-DD
  @ApiProperty() count!: number;
}

export class StatusSliceDto {
  @ApiProperty() columnId!: string;
  @ApiProperty() columnName!: string;
  @ApiProperty() count!: number;
  @ApiProperty() color!: string | null;
}

export class MemberWorkloadDto {
  @ApiProperty() userId!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
  @ApiProperty() count!: number;
}

export class ProjectStatsResponseDto {
  @ApiProperty() totalTasks!: number;
  @ApiProperty() completedTasks!: number;
  @ApiProperty() openTasks!: number;
  @ApiProperty() overdueTasks!: number;
  @ApiProperty({ type: [DayBarDto] }) dailyCompleted!: DayBarDto[];
  @ApiProperty({ type: [StatusSliceDto] }) byStatus!: StatusSliceDto[];
  @ApiProperty({ type: [MemberWorkloadDto] }) memberWorkload!: MemberWorkloadDto[];
}
```

Add `@ApiPropertyOptional()` import and decorator to `MemberWorkloadDto.avatarUrl`.

- [ ] **Step 2: Create `src/modules/reports/reports.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { MembersService } from '@/modules/members/members.service';
import { UsersService } from '@/modules/users/users.service';
import type { ProjectStatsResponseDto, DayBarDto, StatusSliceDto, MemberWorkloadDto } from './dto/project-stats-response.dto';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
    private readonly users: UsersService,
  ) {}

  async getProjectStats(userId: string, projectId: string): Promise<ProjectStatsResponseDto> {
    await this.members.assertMember(projectId, userId);

    const [tasks, columns, assignees] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true, columnId: true, completedAt: true, dueDate: true },
      }),
      this.prisma.column.findMany({ where: { projectId, deletedAt: null }, select: { id: true, name: true, color: true, isDoneCol: true } }),
      this.prisma.taskAssignee.findMany({
        where: { task: { projectId, deletedAt: null } },
        select: { userId: true },
      }),
    ]);

    const now = new Date();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completedAt !== null).length;
    const openTasks = totalTasks - completedTasks;
    const overdueTasks = tasks.filter((t) => !t.completedAt && t.dueDate && t.dueDate < now).length;

    // Last 7 days bar chart
    const dailyCompleted: DayBarDto[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = tasks.filter((t) => t.completedAt?.toISOString().slice(0, 10) === dateStr).length;
      dailyCompleted.push({ label: DAY_LABELS[d.getDay()], date: dateStr, count });
    }

    // By status (column)
    const colMap = new Map(columns.map((c) => [c.id, c]));
    const byStatus: StatusSliceDto[] = columns.map((col) => ({
      columnId: col.id, columnName: col.name, color: col.color,
      count: tasks.filter((t) => t.columnId === col.id).length,
    }));

    // Member workload
    const workerCounts = new Map<string, number>();
    for (const a of assignees) {
      workerCounts.set(a.userId, (workerCounts.get(a.userId) ?? 0) + 1);
    }
    const userIds = [...workerCounts.keys()];
    const snaps = await this.users.findManyByIds(userIds);
    const snapMap = new Map(snaps.map((s) => [s.userId, s]));
    const memberWorkload: MemberWorkloadDto[] = userIds.map((uid) => {
      const snap = snapMap.get(uid);
      return { userId: uid, displayName: snap?.displayName ?? uid, avatarUrl: snap?.avatarUrl, count: workerCounts.get(uid) ?? 0 };
    }).sort((a, b) => b.count - a.count);

    return { totalTasks, completedTasks, openTasks, overdueTasks, dailyCompleted, byStatus, memberWorkload };
  }
}
```

- [ ] **Step 3: Create `src/modules/reports/reports.controller.ts`**

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { ProjectStatsResponseDto } from './dto/project-stats-response.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: '1' })
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('reports/projects/:projectId/stats')
  @ApiOperation({ summary: 'Thống kê project (REST)' })
  @ApiResponse({ status: 200, type: ProjectStatsResponseDto })
  projectStats(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ): Promise<ProjectStatsResponseDto> {
    return this.service.getProjectStats(userId, projectId);
  }
}
```

- [ ] **Step 4: Create `src/modules/reports/reports.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { MembersModule } from '@/modules/members/members.module';
import { UsersModule } from '@/modules/users/users.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [MembersModule, UsersModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
```

- [ ] **Step 5: Add to app.module + Build + Commit**

```bash
npm run build
git add -A
git commit -m "feat(reports): Reports module — project stats REST endpoint"
```

---

### Task 13: Unit Tests (service layer)

**Files:**
- Create: `src/modules/comments/tests/comments.service.spec.ts`
- Create: `src/modules/gateway/tests/task.gateway.spec.ts`
- Create: `src/modules/attachments/tests/attachments.service.spec.ts`

- [ ] **Step 1: Write `src/modules/comments/tests/comments.service.spec.ts`**

```typescript
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommentsService } from '../comments.service';
import { CommentsRepository } from '../comments.repository';
import { MembersService } from '@/modules/members/members.service';
import { UsersService } from '@/modules/users/users.service';
import { TaskGateway } from '@/modules/gateway/task.gateway';

const mockRepo = { create: jest.fn(), findById: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findByTask: jest.fn() };
const mockMembers = { assertMember: jest.fn() };
const mockUsers = { upsertSnapshotRaw: jest.fn(), findManyByIds: jest.fn() };
const mockGateway = { emitToTask: jest.fn() };
const mockEvents = { emit: jest.fn() };

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: CommentsRepository, useValue: mockRepo },
        { provide: MembersService, useValue: mockMembers },
        { provide: UsersService, useValue: mockUsers },
        { provide: TaskGateway, useValue: mockGateway },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();
    service = module.get(CommentsService);
    jest.clearAllMocks();
  });

  it('nên tạo comment và emit socket khi user là member', async () => {
    const fakeComment = { id: 'c1', taskId: 't1', userId: 'u1', content: 'Hello', createdAt: new Date(), updatedAt: new Date(), deletedAt: null };
    mockMembers.assertMember.mockResolvedValue('MEMBER');
    mockUsers.upsertSnapshotRaw.mockResolvedValue(undefined);
    mockRepo.create.mockResolvedValue(fakeComment);

    const result = await service.create('u1', 't1', 'p1', { content: 'Hello', displayName: 'User A' });

    expect(result.content).toBe('Hello');
    expect(mockGateway.emitToTask).toHaveBeenCalledWith('t1', 'comment:created', expect.objectContaining({ id: 'c1' }));
  });

  it('nên throw ForbiddenException khi user không phải member', async () => {
    mockMembers.assertMember.mockRejectedValue(new ForbiddenException());
    await expect(service.create('u1', 't1', 'p1', { content: 'Hello', displayName: 'User A' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('nên throw ForbiddenException khi sửa comment của người khác', async () => {
    const fakeComment = { id: 'c1', userId: 'other-user', taskId: 't1', content: 'Old', createdAt: new Date(), updatedAt: new Date(), deletedAt: null };
    mockMembers.assertMember.mockResolvedValue('MEMBER');
    mockRepo.findById.mockResolvedValue(fakeComment);

    await expect(service.update('u1', 'c1', 't1', 'p1', { content: 'New' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --testPathPattern=comments.service.spec
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(comments): unit tests for CommentsService"
```
