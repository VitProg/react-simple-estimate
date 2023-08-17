import { observer } from "mobx-react-lite";
import { Avatar, Box, Button, Checkbox, FormControlLabel, Grid, Link, Switch, TextField, Typography } from "@mui/material";
import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from "react";
import { getRandomId } from "./utils.ts";
import { ID_PREFIX, LS_MODE, LS_MY_ID, LS_HOST_ID, LS_USER_NAME } from "./constants.ts";
import { peer } from "./peer.ts";
import { state } from "./state.ts";

export const EnterScreen = observer(() => {

  const [mode, setMode] = useState<'new' | 'join'>(localStorage.getItem(LS_MODE) === 'new' ? 'new' : 'join');
  const [myId, setMyId] = useState(parseInt(localStorage.getItem(LS_MY_ID) || getRandomId() + '', 10));
  const [hostId, setHostId] = useState(parseInt(localStorage.getItem(LS_HOST_ID) || '6666', 10));
  const [userName, setUserName] = useState(localStorage.getItem(LS_USER_NAME) || "");
  const [mute, setMute] = useState(false);

  const handleSubmit = useCallback((event: FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMute(true);
    state.setConnecting(true);

    peer.init(userName, myId)
      .then(() => {
        if (mode === 'join') {
          try {
            state.setImHost(false);
            peer.connectToPeer(hostId);
          } catch {
            console.warn('Failed to connect to the host ' + hostId);
            peer.close();
          }
        } else {
          state.setImHost(true);
          state.setShowEnterForm(false);
        }
        state.setConnecting(false);
      });
  }, [userName, myId, mode, hostId]);

  const onModeChanged = useCallback((_: unknown, value: boolean) => {
    const newMode = value ? "new" : "join";
    setMode(newMode);
    localStorage.setItem(LS_MODE, newMode);
  }, []);

  const onServerIdChanged = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    let newId = parseInt(event.target.value);
    if (isNaN(newId)) newId = 0;
    setHostId(newId);
    if (newId <=0 ) {
      localStorage.removeItem(LS_HOST_ID);
    } else {
      localStorage.setItem(LS_HOST_ID, newId.toString());
    }
  }, []);

  const onMyIDChanged = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    let newId = parseInt(event.target.value);
    if (isNaN(newId)) newId = 0;
    setMyId(newId);
    if (newId <=0 ) {
      localStorage.removeItem(LS_MY_ID);
    } else {
      localStorage.setItem(LS_MY_ID, newId.toString());
    }
  }, []);

  const onUserNameChanged = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value.trim();
    setUserName(newName);
    if (!newName) {
      localStorage.removeItem(LS_USER_NAME);
    } else {
      localStorage.setItem(LS_USER_NAME, newName);
    }
  }, []);

  const ok = useMemo(
    () => mode == "join"
      ? (userName.length > 1 && hostId > 0 && myId > 0)
      : (userName.length > 1 && myId > 0),
  [mode, myId, hostId, userName.length]
  );

  return (
    <Box
      sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Typography component="h1" variant="h5">
        Create / Enter planning room
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
        <FormControlLabel
          control={<Switch checked={mode == 'new'} color="primary" onChange={onModeChanged} />}
          label={<span>Create new planning room <Typography component={'span'} sx={{color: "grey"}}>(You'd be the host)</Typography></span>}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="name"
          label="Your Name"
          type="text"
          value={userName}
          onChange={onUserNameChanged}
          onInvalid={console.log}
          disabled={mute}
        />
        {
          mode === 'new' ?
            <TextField
              margin="normal"
              required
              fullWidth
              type="number"
              label="My/Host ID"
              name="my_host_id"
              autoFocus
              value={myId}
              onChange={onMyIDChanged}
              onInvalid={console.log}
              disabled={mute}
            /> :
            <>
              <TextField
                margin="normal"
                required
                fullWidth
                type="number"
                label="Host ID"
                name="host_id"
                autoFocus
                value={hostId}
                onChange={onServerIdChanged}
                onInvalid={console.log}
                disabled={mute}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                type="number"
                label="My ID"
                name="my_id"
                value={myId}
                onChange={onMyIDChanged}
                onInvalid={console.log}
                disabled={mute}
              />
            </>
        }
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={!ok || mute}
        >
          {mute ? 'initializing...' : (mode === 'new' ? 'Create' : 'Join')}
        </Button>
      </Box>
    </Box>
  )
})
