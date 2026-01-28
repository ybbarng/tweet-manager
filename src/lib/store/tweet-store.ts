'use client';

import { createContext, type Dispatch, useContext } from 'react';
import type {
  AppState,
  DeletionProgress,
  Tweet,
  TweetFilter,
  TwitterAuth,
  TwitterUser,
} from '@/types';

const initialState: AppState = {
  auth: null,
  user: null,
  tweets: [],
  filters: [],
  excludedTweetIds: new Set(),
  deletionProgress: {
    total: 0,
    completed: 0,
    failed: 0,
    status: 'idle',
  },
  loading: false,
  step: 'auth',
};

type Action =
  | { type: 'SET_AUTH'; payload: { auth: TwitterAuth; user: TwitterUser } }
  | { type: 'LOGOUT' }
  | { type: 'SET_TWEETS'; payload: Tweet[] }
  | { type: 'APPEND_TWEETS'; payload: Tweet[] }
  | { type: 'SET_FILTERS'; payload: TweetFilter[] }
  | { type: 'TOGGLE_EXCLUDE'; payload: string }
  | { type: 'SET_DELETION_PROGRESS'; payload: Partial<DeletionProgress> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_STEP'; payload: AppState['step'] }
  | { type: 'REMOVE_DELETED_TWEETS'; payload: string[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        auth: action.payload.auth,
        user: action.payload.user,
      };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_TWEETS':
      return { ...state, tweets: action.payload };
    case 'APPEND_TWEETS':
      return { ...state, tweets: [...state.tweets, ...action.payload] };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'TOGGLE_EXCLUDE': {
      const next = new Set(state.excludedTweetIds);
      if (next.has(action.payload)) {
        next.delete(action.payload);
      } else {
        next.add(action.payload);
      }
      return { ...state, excludedTweetIds: next };
    }
    case 'SET_DELETION_PROGRESS':
      return {
        ...state,
        deletionProgress: { ...state.deletionProgress, ...action.payload },
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'REMOVE_DELETED_TWEETS':
      return {
        ...state,
        tweets: state.tweets.filter((t) => !action.payload.includes(t.id)),
      };
    default:
      return state;
  }
}

export const AppStateContext = createContext<AppState>(initialState);
export const AppDispatchContext = createContext<Dispatch<Action>>(() => {});

export function useAppState() {
  return useContext(AppStateContext);
}

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}

export { initialState, reducer };
export type { Action };
