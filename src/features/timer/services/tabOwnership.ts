import { ActiveTimerState } from '../types';

export const LEASE_DURATION_MS = 6000; // 6 seconds lease
export const HEARTBEAT_INTERVAL_MS = 2500; // heartbeat renews every 2.5s

export class TabOwnershipManager {
  private static instance: TabOwnershipManager;
  public readonly tabId: string;
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(message: any) => void> = new Set();

  private constructor() {
    let existingTabId: string | null = null;
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      try {
        existingTabId = window.sessionStorage.getItem('my_workspace_timer_tab_id');
      } catch {
        // Ignore sessionStorage security or access errors
      }
    }

    if (existingTabId) {
      this.tabId = existingTabId;
    } else {
      this.tabId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : 'tab_' + Math.random().toString(36).substring(2, 11);

      if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
        try {
          window.sessionStorage.setItem('my_workspace_timer_tab_id', this.tabId);
        } catch {
          // Ignore
        }
      }
    }

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('my_workspace_timer_channel');
        (this.channel as any)?.unref?.();
        this.channel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported or failed to initialize', e);
      }
    }
  }

  public static getInstance(): TabOwnershipManager {
    if (!TabOwnershipManager.instance) {
      TabOwnershipManager.instance = new TabOwnershipManager();
    }
    return TabOwnershipManager.instance;
  }

  public subscribe(listener: (message: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(message: any) {
    this.listeners.forEach(fn => {
      try {
        fn(message);
      } catch (e) {
        console.error('Error in tab ownership listener', e);
      }
    });
  }

  public broadcast(message: any): void {
    if (this.channel) {
      try {
        this.channel.postMessage({ ...message, senderTabId: this.tabId });
      } catch (e) {
        console.warn('Failed to broadcast message', e);
      }
    }
  }

  /**
   * Checks whether this tab owns the active timer lease.
   */
  public isOwner(activeState: ActiveTimerState | null, now: number = Date.now()): boolean {
    if (!activeState) return true;
    if (!activeState.ownerTabId) return true;
    if (activeState.ownerTabId === this.tabId) return true;
    // If lease expired, it is fair game for any tab to claim
    if (activeState.ownerLeaseExpiresAt && activeState.ownerLeaseExpiresAt < now) {
      return true;
    }
    return false;
  }

  /**
   * Returns true if another active tab currently owns the timer.
   */
  public isOwnedByAnotherTab(activeState: ActiveTimerState | null, now: number = Date.now()): boolean {
    if (!activeState) return false;
    if (!activeState.ownerTabId) return false;
    if (activeState.ownerTabId === this.tabId) return false;
    return !!(activeState.ownerLeaseExpiresAt && activeState.ownerLeaseExpiresAt >= now);
  }

  /**
   * Creates an updated state claiming ownership for this tab.
   */
  public prepareOwnershipClaim(state: ActiveTimerState, now: number = Date.now()): ActiveTimerState {
    return {
      ...state,
      ownerTabId: this.tabId,
      ownerLeaseExpiresAt: now + LEASE_DURATION_MS,
      lastHeartbeat: now,
    };
  }

  /**
   * Releases ownership in the state.
   */
  public prepareOwnershipRelease(state: ActiveTimerState): ActiveTimerState {
    return {
      ...state,
      ownerTabId: null,
      ownerLeaseExpiresAt: null,
    };
  }
}
