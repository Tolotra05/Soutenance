'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Paperclip, Calendar, GripVertical,
  ChevronRight, Image as ImageIcon, FileText, Download, X, Upload,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PriorityBadge } from '@/components/shared/badges';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ProgressBar } from '@/components/shared/progress';
import { getUser, formatDate, subtaskStatusMeta } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { Subtask, SubtaskStatus, User as UserType, Attachment } from '@/types';

interface KanbanColumn {
  id: SubtaskStatus;
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
}

const columns: KanbanColumn[] = [
  { id: 'todo', label: 'À faire', color: 'text-muted-foreground', bgColor: 'bg-muted/30', dotColor: 'bg-muted-foreground' },
  { id: 'in_progress', label: 'En cours', color: 'text-primary', bgColor: 'bg-primary/5', dotColor: 'bg-primary' },
  { id: 'review', label: 'En revue', color: 'text-chart-5', bgColor: 'bg-chart-5/5', dotColor: 'bg-chart-5' },
  { id: 'done', label: 'Terminé', color: 'text-success', bgColor: 'bg-success/5', dotColor: 'bg-success' },
  { id: 'cancelled', label: 'Annulé', color: 'text-destructive', bgColor: 'bg-destructive/5', dotColor: 'bg-destructive' },
];

interface KanbanBoardProps {
  subtasks: Subtask[];
  users: UserType[];
  canManage: boolean;
  currentUserId: string;
  onStatusChange: (subtaskId: string, status: SubtaskStatus) => void;
  onOpenDetail: (subtask: Subtask) => void;
  onAddDeliverable?: (subtaskId: string, file: Attachment) => void;
}

export function KanbanBoard({
  subtasks,
  users,
  canManage,
  currentUserId,
  onStatusChange,
  onOpenDetail,
  onAddDeliverable,
}: KanbanBoardProps) {
  const [viewingFile, setViewingFile] = useState<{ url: string; fileName: string; fileType: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const getColumnTasks = (status: SubtaskStatus) =>
    subtasks.filter((st) => st.status === status);

  const getStatusTransition = (currentStatus: SubtaskStatus): SubtaskStatus | null => {
    switch (currentStatus) {
      case 'todo': return 'in_progress';
      case 'in_progress': return 'review';
      case 'review': return 'done';
      case 'done': return null;
      case 'cancelled': return null;
      default: return null;
    }
  };

  const handleDragStart = (id: string) => setDraggingId(id);
  const handleDragEnd = () => setDraggingId(null);
  const handleDrop = (e: React.DragEvent, status: SubtaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const subtaskId = e.dataTransfer.getData('text/plain');
    if (subtaskId && canManage) onStatusChange(subtaskId, status);
  };

  return (
    <div>
      {canManage && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-[11px] text-muted-foreground">
          <GripVertical className="h-3.5 w-3.5" />
          Glissez-déposez les tâches entre les colonnes pour changer leur statut.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {columns.map((col) => {
          const tasks = getColumnTasks(col.id);
          return (
            <div
              key={col.id}
              className={cn('min-w-0 rounded-2xl transition-colors', dragOverCol === col.id && 'bg-primary/5 ring-2 ring-primary/40')}
              onDragEnter={(e) => { if (canManage) { e.preventDefault(); setDragOverCol(col.id); } }}
              onDragOver={(e) => { if (canManage) e.preventDefault(); }}
              onDragLeave={(e) => {
                if (canManage && !e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCol((c) => (c === col.id ? null : c));
                }
              }}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3', col.bgColor)}>
                <span className={cn('h-2.5 w-2.5 rounded-full', col.dotColor)} />
                <h3 className={cn('text-sm font-semibold', col.color)}>{col.label}</h3>
                <span className="ml-auto inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-background/80 text-xs font-bold text-muted-foreground">
                  {tasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 min-h-[200px]">
                <AnimatePresence mode="popLayout">
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <KanbanCard
                        task={task}
                        users={users}
                        canManage={canManage}
                        currentUserId={currentUserId}
                        onStatusChange={onStatusChange}
                        onOpenDetail={onOpenDetail}
                        onAddDeliverable={onAddDeliverable}
                        onViewFile={setViewingFile}
                        nextStatus={getStatusTransition(task.status)}
                        dragging={draggingId === task.id}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {tasks.length === 0 && (
                  <div className={cn('rounded-xl border-2 border-dashed border-border/50 p-6 text-center')}>
                    <p className="text-xs text-muted-foreground">Aucune tâche</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* File Viewer Dialog */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewingFile(null)}>
          <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{viewingFile.fileName}</span>
              </div>
              <button onClick={() => setViewingFile(null)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              {viewingFile.fileType.startsWith('image/') && viewingFile.fileType !== 'image/svg+xml' ? (
                <div>
                  <div className="flex justify-center mb-3">
                    <a
                      href={viewingFile.url}
                      download={viewingFile.fileName}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium px-3.5 py-1.5 hover:bg-primary/90 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Télécharger
                    </a>
                  </div>
                  <img src={viewingFile.url} alt={viewingFile.fileName} className="max-w-full max-h-[60vh] rounded-lg object-contain mx-auto" />
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">{viewingFile.fileName}</p>
                  <a
                    href={viewingFile.url}
                    download={viewingFile.fileName}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium px-3.5 py-2 hover:bg-primary/90 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Télécharger
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface KanbanCardProps {
  task: Subtask;
  users: UserType[];
  canManage: boolean;
  currentUserId: string;
  onStatusChange: (subtaskId: string, status: SubtaskStatus) => void;
  onOpenDetail: (subtask: Subtask) => void;
  onAddDeliverable?: (subtaskId: string, file: Attachment) => void;
  onViewFile: (file: { url: string; fileName: string; fileType: string }) => void;
  nextStatus: SubtaskStatus | null;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

function KanbanCard({
  task,
  users,
  canManage,
  currentUserId,
  onStatusChange,
  onOpenDetail,
  onAddDeliverable,
  onViewFile,
  nextStatus,
  dragging,
  onDragStart,
  onDragEnd,
}: KanbanCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assignee = getUser(users, task.assignedToId);
  const deliverables = task.attachments ?? [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !onAddDeliverable) return;
    Array.from(files).forEach((file) => {
      const att: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        fileType: file.type,
        url: URL.createObjectURL(file),
        uploadedBy: currentUserId,
        uploadedAt: new Date().toISOString(),
      };
      onAddDeliverable(task.id, att);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-3 w-3" />;
    return <FileText className="h-3 w-3" />;
  };

  return (
    <Card
      className={cn(
        'p-3.5 hover:shadow-soft-lg hover:border-primary/30 transition-all cursor-pointer group',
        canManage && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-50'
      )}
      onClick={() => onOpenDetail(task)}
      draggable={canManage}
      onDragStart={(e) => { if (canManage) { e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(task.id); } }}
      onDragEnd={onDragEnd}
    >
      {/* Header: Title + Priority */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{task.title}</p>
        <PriorityBadge priority={task.priority} className="flex-shrink-0" />
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">{task.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progression</span>
          <span className="font-medium">{task.status === 'cancelled' ? '—' : `${task.progress}%`}</span>
        </div>
        {task.status !== 'cancelled' && (
          <ProgressBar
            value={task.progress}
            indicatorClassName={task.progress < 33 ? 'bg-destructive' : task.progress < 66 ? 'bg-warning' : 'bg-success'}
            className="h-1.5"
          />
        )}
      </div>

      {/* Deliverables */}
      {task.status !== 'cancelled' && deliverables.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">Livrables</p>
          <div className="flex flex-wrap gap-1.5">
            {deliverables.slice(0, 3).map((att) => (
              <button
                key={att.id}
                onClick={(e) => { e.stopPropagation(); onViewFile({ url: att.url, fileName: att.fileName, fileType: att.fileType }); }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/5 border border-primary/15 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                {fileIcon(att.fileType)}
                <span className="truncate max-w-[80px]">{att.fileName}</span>
              </button>
            ))}
            {deliverables.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-lg bg-muted/50 text-[10px] text-muted-foreground">
                +{deliverables.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(task.startDate)} → {formatDate(task.dueDate)}
        </span>
      </div>

      {/* Footer: Assignee + Actions */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
        {/* Assignee */}
        <div className="flex items-center gap-1.5">
          {assignee ? (
            <>
              <UserAvatar user={assignee} size="sm" className="h-5 w-5" />
              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{assignee.name}</span>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 italic">Non assigné</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Comments indicator */}
          {task.comments.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDetail(task); }}
              className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <MessageSquare className="h-3 w-3" />
              {task.comments.length}
            </button>
          )}

          {/* Upload deliverable */}
          {canManage && onAddDeliverable && (
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              title="Ajouter un livrable"
            >
              <Upload className="h-3 w-3" />
            </button>
          )}
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />

          {/* Advance status */}
          {canManage && nextStatus && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, nextStatus); }}
              className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] text-primary hover:bg-primary/10 transition-colors font-medium"
              title={`Passer à "${subtaskStatusMeta[nextStatus].label}"`}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
