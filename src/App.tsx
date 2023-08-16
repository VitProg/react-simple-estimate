import './App.css'
import { Box, Button, Container, createTheme, CssBaseline, Stack, ThemeProvider, Typography } from "@mui/material";
import { observer } from "mobx-react-lite";
import { state } from "./state.ts";
import { EnterScreen } from "./enterScreen.tsx";
import { CERT_CARDS, TIME_CARDS } from "./constants.ts";
import { Card, CardType, SelectedCard } from "./types.ts";
import { peer } from "./peer.ts";

const defaultTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export const App = observer(() => {
  const onCardClicked = (type: CardType, card: Card) => {
    console.log('Card Clicked', type, card);
    const sc = {
      userId: state.iam!.id,
      type,
      card,
    } as SelectedCard;
    if (state.hasSelected(sc)) {
      peer.cardSelect(sc, false);
    } else {
      peer.cardSelect(sc, true);
    }
  }

  const bothSelected = state.hasUserSelectedBothCards(state.iam?.id);
  const ready = !!state.iam?.ready;
  const fin = state.fin;

  const onImReadyClicked = () => peer.userReady(state.iam?.id)

  const onShowResultsClicked = () => {
    peer.stop();
  }

  const onNewEstimateClicked = () => {
    peer.new();
  }

  return (
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline/>
      <Container maxWidth="sm">
        {state.error && <Typography color="yellow">Error: {state.error}</Typography>}
        {state.fatalError && <Typography color="red">FatalError: {state.fatalError}</Typography>}

        {state.showEnterForm && <EnterScreen/>}
        <Stack spacing={2}>
          {state.users.map(u => (
            <Box key={u.id} color={state.hasUserSelectedBothCards(u.id) && u.ready ? 'green' : 'inherit'}>{u.name}</Box>
          ))}
        </Stack>

        <h4>Time Cards</h4>
        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
          {TIME_CARDS.map(c => (
            <div key={c}>
              <Button variant={state.iam && state.hasUserSelectedCard(state.iam.id, 'time', c) ? 'contained' : 'outlined'}  disabled={ready || fin} onClick={() => onCardClicked('time', c)}>{c}</Button>
            </div>
          ))}
        </Stack>

        <h4>Cert Cards</h4>
        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
          {CERT_CARDS.map(c => (
            <div key={c}>
              <Button variant={state.iam && state.hasUserSelectedCard(state.iam.id, 'cert', c) ? 'contained' : 'outlined'}  disabled={ready || fin} onClick={() => onCardClicked('cert', c)}>{c}</Button>
            </div>
          ))}
        </Stack>

        <Box sx={{marginTop: 5}}>
          {!state.allUsersReady && !fin && bothSelected && ready && (
            <Typography color="green">Waiting for the other members...</Typography>
          )}

          {(state.allUsersReady || fin) && (
            <>
              <Typography color="green">Results:</Typography>
              <Stack spacing={2}>
                {state.users.map(u => (
                  <div key={u.id}>{u.name} - {state.userSelectedCard(u.id, 'time')?.card}h / {state.userSelectedCard(u.id, 'cert')?.card}%</div>
                ))}
                <div>-------------------------</div>
                <div>Avg: {state.avgTime}h / {state.avgCert}%</div>
              </Stack>
            </>
          )}

          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" justifyContent="center">
            {!fin && bothSelected && !ready && <Button variant="contained" onClick={onImReadyClicked}>I'm ready!</Button>}
            {state.imHost && <Button variant="contained" onClick={onNewEstimateClicked}>New estimate</Button>}
            {state.imHost && !fin && !state.allUsersReady && <Button variant="contained" onClick={onShowResultsClicked}>Show results</Button>}
          </Stack>
        </Box>
      </Container>
    </ThemeProvider>
  )
});

