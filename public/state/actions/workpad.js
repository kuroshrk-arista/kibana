import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';
import { without, includes } from 'lodash';
import { getWorkpadColors } from '../selectors/workpad';
import { fetchAllRenderables } from './elements';

export const sizeWorkpad = createAction('sizeWorkpad');
export const setName = createAction('setName');
export const setColors = createAction('setColors');
export const setRefreshInterval = createAction('setRefreshInterval');

export const initializeWorkpad = createThunk('initializeWorkpad', ({ dispatch }) => {
  dispatch(fetchAllRenderables());
});

export const addColor = createThunk('addColor', ({ dispatch, getState }, color) => {
  const colors = getWorkpadColors(getState()).slice(0);
  if (!includes(colors, color)) colors.push(color);
  dispatch(setColors(colors));
});

export const removeColor = createThunk('removeColor', ({ dispatch, getState }, color) => {
  dispatch(setColors(without(getWorkpadColors(getState()), color)));
});

export const setWorkpad = createThunk('setWorkpad', ({ dispatch, type }, workpad) => {
  dispatch(setRefreshInterval(0)); // disable refresh interval
  dispatch(createAction(type)(workpad)); // set the workpad object in state
  dispatch(initializeWorkpad()); // load all the elements on the workpad
});
