import React from 'react';
import { useEffect } from 'react';
import { useGameContext } from './Context.jsx';

function Events(){

    const { socket, setPlayers, setDisplayGame, setAdmin, room} = useGameContext();
    useEffect(() => {
    
        socket.on("updatePlayerList", (playerList) => {
          setPlayers([...playerList]);
        });
    
        socket.on("gameStarted", () => {
          setDisplayGame(true);
        });
        
        socket.on("setAdmin", (admin) => {
          setAdmin(admin);
          console.log("Admin status set to:", admin);
        });
    
        return () => {
          socket.off("updatePlayerList");
          socket.off("gameStarted");
          socket.off("setAdmin");
          socket.off("reset_game");
        };
    }, [room]);
    
    return (
        <>
        </>
    );
};

export default Events;