'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import {
  useAddContact,
  useProjectClient,
  useRemoveContact,
  useUpdateContact,
  useUpsertClient,
} from '../../hooks/useClient';
import type { ProjectContact } from '../../types';
import { useProjectRole } from '../../hooks/useProjectRole';

export function ClientTab({ projectId }: { projectId: string }) {
  const client = useProjectClient(projectId);
  const { canManage } = useProjectRole(projectId);

  if (client.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientNameForm projectId={projectId} name={client.data?.name ?? ''} canManage={canManage} />
      {client.data && (
        <ContactList projectId={projectId} contacts={client.data.contacts} canManage={canManage} />
      )}
    </div>
  );
}

function ClientNameForm({
  projectId,
  name,
  canManage,
}: {
  projectId: string;
  name: string;
  canManage: boolean;
}) {
  const [value, setValue] = useState(name);
  const upsert = useUpsertClient(projectId);

  return (
    <div key={name} className="flex items-end gap-2">
      <Input
        label="Tên khách hàng"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="VD: ACME Corporation"
        className="max-w-sm"
      />
      {canManage && (
        <Button
          onClick={() => upsert.mutate(value.trim())}
          disabled={!value.trim() || value.trim() === name}
          isLoading={upsert.isPending}
        >
          Lưu
        </Button>
      )}
    </div>
  );
}

function ContactList({
  projectId,
  contacts,
  canManage,
}: {
  projectId: string;
  contacts: ProjectContact[];
  canManage: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectContact | null>(null);
  const [deleting, setDeleting] = useState<ProjectContact | null>(null);
  const removeContact = useRemoveContact(projectId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Người liên hệ</h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Thêm người liên hệ
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có người liên hệ nào.
        </p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {contact.name}
                  </span>
                  {contact.isPrimary && (
                    <Badge variant="soft-primary" size="sm">
                      Liên hệ chính
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[contact.title, contact.email].filter(Boolean).join(' · ') ||
                    '—'}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Sửa ${contact.name}`}
                    onClick={() => setEditing(contact)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Xoá ${contact.name}`}
                    onClick={() => setDeleting(contact)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ContactFormDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
      />
      {editing && (
        <ContactFormDialog
          key={editing.id}
          projectId={projectId}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          contact={editing}
        />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá người liên hệ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} sẽ bị xoá khỏi danh sách liên hệ của dự án.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Huỷ
            </Button>
            <Button
              variant="danger"
              isLoading={removeContact.isPending}
              onClick={() => {
                if (!deleting) return;
                removeContact.mutate(deleting.id, {
                  onSuccess: () => setDeleting(null),
                });
              }}
            >
              Xoá
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContactFormDialog({
  projectId,
  open,
  onOpenChange,
  mode,
  contact,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  contact?: ProjectContact;
}) {
  const [name, setName] = useState(contact?.name ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [title, setTitle] = useState(contact?.title ?? '');
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary ?? false);
  const addContact = useAddContact(projectId);
  const updateContact = useUpdateContact(projectId);
  const pending =
    mode === 'create' ? addContact.isPending : updateContact.isPending;

  function reset() {
    setName('');
    setEmail('');
    setTitle('');
    setIsPrimary(false);
  }

  function handleSubmit() {
    const input = {
      name: name.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(title.trim() ? { title: title.trim() } : {}),
      isPrimary,
    };

    if (mode === 'create') {
      addContact.mutate(input, {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      });
    } else if (contact) {
      updateContact.mutate(
        { contactId: contact.id, input },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen && mode === 'create') reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Thêm người liên hệ' : 'Sửa người liên hệ'}
          </DialogTitle>
          <DialogDescription>Thông tin người phía khách hàng.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            label="Tên"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            label="Email (không bắt buộc)"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Chức danh (không bắt buộc)"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Checkbox
            label="Liên hệ chính"
            checked={isPrimary}
            onCheckedChange={(checked) => setIsPrimary(checked === true)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            isLoading={pending}
          >
            {mode === 'create' ? 'Thêm' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
