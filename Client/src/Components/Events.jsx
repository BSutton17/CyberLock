import React from 'react';
import { useEffect } from 'react';
import { useGameContext } from './Context.jsx';

function Events(){

    const { socket, setPlayers, setDisplayGame, setAdmin, setScreen, setPlayerCharacters, setReadyPlayers, room} = useGameContext();
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

        socket.on("update_ready_status", (readyList) => {
          setReadyPlayers(readyList);
        });

        socket.on("start_main_game", () => {
          setScreen("main");
        });
    
        return () => {
          socket.off("updatePlayerList");
          socket.off("gameStarted");
          socket.off("setAdmin");
          socket.off("update_character_selections");
          socket.off("update_ready_status");
          socket.off("start_main_game");
          socket.off("reset_game");
        };
    }, [room]);
    
    return (
        <>
        </>
    );
};

export default Events;