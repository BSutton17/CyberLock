import React from 'react';
import { useEffect } from 'react';
import { useGameContext } from './Context.jsx';

function Events(){

    const { socket, setPlayers, setDisplayGame, setAdmin, setScreen, setPlayerCharacters, room} = useGameContext();
    useEffect(() => {
    
        socket.on("updatePlayerList", (playerList) => {
          setPlayers([...playerList]);
        });
    
        socket.on("gameStarted", () => {
          setDisplayGame(true);
          setScreen("characterSelect");
        });
        
        socket.on("setAdmin", (admin) => {
          setAdmin(admin);
          console.log("Admin status set to:", admin);
        });

        socket.on("update_character_selections", (selections) => {
          setPlayerCharacters(selections);
        });
    
        return () => {
          socket.off("updatePlayerList");
          socket.off("gameStarted");
          socket.off("setAdmin");
          socket.off("update_character_selections");
          socket.off("reset_game");
        };
    }, [room]);
    
    return (
        <>
        </>
    );
};

export default Events;