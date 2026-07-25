// Jotai state for the chat-invite feature (问问 AI). Uses the default store
// (no Provider): the modal is client-only and interactive, so there is no
// cross-request leakage concern (defaults render identically on the server).
import { atom } from 'jotai'

/** Whether the chat-invite modal is open. */
export const chatOpenAtom = atom<boolean>(false)
