import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ProjectActivity, ProjectActivityChange, ProjectActivityTask } from '@voice/contracts';
import { I18nService, TranslatePipe } from './i18n.service';
import type { StudioApi } from './semantic-review.component';

export interface ProjectActivityDocumentSelection {
  documentId: string;
  taskId?: string;
  proposalId?: string;
}

type TaskFilter = 'all' | 'active' | 'attention' | 'finished';
type ChangeFilter = 'applied' | 'all' | 'pending';

@Component({
  selector: 'voice-project-activity',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './project-activity.component.html',
  styleUrl: './project-activity.component.css',
})
export class ProjectActivityComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) projectId = '';
  @Input({ required: true }) projectName = '';
  @Input({ required: true }) api!: StudioApi;
  @Input() mode: 'tasks' | 'history' = 'tasks';
  @Output() openDocument = new EventEmitter<ProjectActivityDocumentSelection>();

  readonly i18n = inject(I18nService);
  readonly activity = signal<ProjectActivity | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly search = signal('');
  readonly taskFilter = signal<TaskFilter>('all');
  readonly changeFilter = signal<ChangeFilter>('applied');
  readonly loadedAt = signal<string | null>(null);
  private sequence = 0;
  private loadedProject = '';
  private loadedApi?: StudioApi;
  private loadedMode: 'tasks' | 'history' = 'tasks';

  readonly tasks = computed(() => [...(this.activity()?.tasks ?? [])].sort((a, b) => this.time(b.updatedAt) - this.time(a.updatedAt)));
  readonly changes = computed(() => [...(this.activity()?.changes ?? [])].sort((a, b) => this.time(b.appliedAt ?? b.createdAt) - this.time(a.appliedAt ?? a.createdAt)));
  readonly activeCount = computed(() => this.tasks().filter(item => this.taskGroup(item) === 'active').length);
  readonly attentionCount = computed(() => this.tasks().filter(item => this.taskGroup(item) === 'attention').length);
  readonly finishedCount = computed(() => this.tasks().filter(item => this.taskGroup(item) === 'finished').length);
  readonly appliedCount = computed(() => this.changes().filter(item => item.state === 'applied').length);
  readonly pendingCount = computed(() => this.changes().filter(item => item.state === 'pending').length);
  readonly visibleTasks = computed(() => {
    const filter = this.taskFilter();
    return this.tasks().filter(item => (filter === 'all' || this.taskGroup(item) === filter)
      && this.matches([item.instruction, item.documentTitle, item.documentPath, item.id, this.i18n.t(this.taskLabel(item))]));
  });
  readonly visibleChanges = computed(() => {
    const filter = this.changeFilter();
    return this.changes().filter(item => (filter === 'all' || item.state === filter)
      && this.matches([item.documentTitle, item.documentPath, item.reason, item.before, item.after, item.id, item.taskId ?? '', this.i18n.t(this.changeLabel(item))]));
  });

  ngOnChanges(): void {
    const changedMode = this.mode !== this.loadedMode;
    this.loadedMode = this.mode;
    if (this.projectId === this.loadedProject && this.api === this.loadedApi) {
      if (changedMode) {
        this.search.set('');
        if (this.mode === 'tasks') this.taskFilter.set('all');
        else this.changeFilter.set('applied');
      }
      return;
    }
    this.loadedProject = this.projectId;
    this.loadedApi = this.api;
    this.activity.set(null);
    this.loadedAt.set(null);
    this.search.set('');
    this.taskFilter.set('all');
    this.changeFilter.set('applied');
    void this.reload();
  }

  async reload(): Promise<void> {
    const sequence = ++this.sequence;
    const projectId = this.projectId;
    this.error.set('');
    if (!projectId || !this.api) {
      this.loading.set(false);
      this.activity.set(null);
      return;
    }
    this.loading.set(true);
    try {
      const activity = await this.api<ProjectActivity>('/api/projects/' + encodeURIComponent(projectId) + '/activity');
      if (sequence !== this.sequence) return;
      if (!activity || activity.projectId !== projectId || !Array.isArray(activity.tasks) || !Array.isArray(activity.changes)) {
        throw new Error('Die Projektübersicht ist noch nicht verfügbar. Aktualisiere das Backend und lade den Stand erneut.');
      }
      this.activity.set(activity);
      this.loadedAt.set(new Date().toISOString());
    } catch (error) {
      if (sequence === this.sequence) {
        this.error.set(error instanceof Error ? error.message : 'Die Projektaktivität konnte nicht geladen werden.');
      }
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }

  resetFilters(): void {
    this.search.set('');
    this.taskFilter.set('all');
    this.changeFilter.set('all');
  }

  taskGroup(task: ProjectActivityTask): Exclude<TaskFilter, 'all'> {
    if (task.status === 'applied' || task.status === 'completed') return 'finished';
    if (task.status === 'queued' || task.status === 'running' || task.status === 'cancelling') return 'active';
    return 'attention';
  }

  taskLabel(task: ProjectActivityTask): string {
    if (task.status === 'completed') return task.resolution === 'manual' ? 'Als bearbeitet markiert' : 'Vom Agent als erfüllt bewertet';
    return ({
      queued: 'Bereit zur Übergabe', running: 'In Bearbeitung', cancelling: 'Abbruch läuft',
      ready: 'Ergebnis prüfen', failed: 'Fehlgeschlagen', cancelled: 'Abgebrochen',
      applied: 'Übernommen', stale: 'Quelle oder Feedback geändert',
      interrupted: 'Durch Neustart unterbrochen', needs_review: 'Klärung nötig',
    } as Record<string, string>)[task.status] ?? task.status;
  }

  taskNextStep(task: ProjectActivityTask): string {
    if (task.status === 'completed') return task.resolution === 'manual'
      ? 'Mit Begründung geschlossen. Dabei wurde kein neuer Quelldiff übernommen.'
      : 'Der Agent meldet den Auftrag als erfüllt. Dabei wurde kein neuer Quelldiff übernommen.';
    return ({
      queued: 'Gespeichert. In der Datei kannst du die Bearbeitung starten.',
      running: 'Der Runner bearbeitet den Auftrag. Das Ergebnis steht noch aus.',
      cancelling: 'Der Abbruch ist angefordert. Der endgültige Status steht noch aus.',
      ready: 'Öffne den Vorschlag und entscheide, ob du ihn übernehmen möchtest.',
      failed: 'Öffne die Aufgabe, prüfe den Fehler und bereite bei Bedarf einen neuen Auftrag vor.',
      cancelled: 'Die Bearbeitung wurde abgebrochen. Der gespeicherte Auftrag bleibt einsehbar.',
      applied: 'In der Quelle gespeichert. Prüfung und Veröffentlichung bleiben separate Schritte.',
      stale: 'Prüfe den neuen Quell- oder Feedbackstand, bevor du einen neuen Auftrag vorbereitest.',
      interrupted: 'Der Dienst wurde neu gestartet. Die Aufgabe wurde nicht automatisch erneut ausgeführt.',
      needs_review: 'Kläre die offenen Fragen oder schließe die Aufgabe mit einer Begründung ab.',
    } as Record<string, string>)[task.status] ?? 'Öffne die Aufgabe für Details und nächste Schritte.';
  }

  changeLabel(change: ProjectActivityChange): string {
    return ({ applied: 'Übernommen', pending: 'Vorgeschlagen' } as Record<string, string>)[change.state] ?? change.state;
  }

  heading(value: string): string {
    // Import references are useful in the full instruction, but not as a task title.
    const display = value.replace(/^(?:\s*\[[^\]\r\n]+\]\s*)+/, '').trim() || value;
    const firstLine = display.split(/\r?\n/).find(line => line.trim())?.trim() ?? '';
    return firstLine.length > 150 ? firstLine.slice(0, 149).trimEnd() + '…' : firstLine;
  }

  formatDate(value: string | null): string {
    if (!value) return this.i18n.t('Datum nicht gespeichert');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return this.i18n.t('Datum nicht gespeichert');
    return new Intl.DateTimeFormat(this.i18n.locale() === 'de' ? 'de-DE' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(date);
  }

  openTask(task: ProjectActivityTask): void {
    this.openDocument.emit({ documentId: task.documentId, taskId: task.id, ...(task.proposalId ? { proposalId: task.proposalId } : {}) });
  }

  openChange(change: ProjectActivityChange): void {
    this.openDocument.emit({ documentId: change.documentId, proposalId: change.id, ...(change.taskId ? { taskId: change.taskId } : {}) });
  }

  private matches(values: string[]): boolean {
    const terms = this.search().trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const haystack = values.join('\n').toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
  }

  private time(value: string | null): number {
    return value ? Date.parse(value) || 0 : 0;
  }

  ngOnDestroy(): void { ++this.sequence; }
}
