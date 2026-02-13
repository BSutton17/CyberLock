import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../Components/Context';
import './LevelUp.css';

function LevelUp(){

    return(
        <div>
            <button onClick={() => alert("Test")}>Test</button>
        </div>
    )
}

export default LevelUp;