import { useState, useEffect, useRef } from 'react'
import { db } from './firebaseConfig'
import {collection,doc,onSnapshot,query,getDoc,setDoc,} from 'firebase/firestore'
import './Lobby.css'
import PlayerList from './PlayerList'
import DrawingBoard from './DrawingBoard'
import Timer from './Timer'
import HostScreen from './HostScreen'

function Lobby(props) {


    const [gameStarted, setGameStarted] = useState(false)
    const [isGameMaster, setIsGameMaster] = useState(false)

    const handleStartGame = async ()=>{

        //change the lobby flag for game started, this should make everyone in lobby switch state too
        const roomsCollectionRef = collection(db, "rooms");
        const roomsDocRef = doc(roomsCollectionRef, props.roomCode)
        const roomSnapshot = await getDoc(roomsDocRef)

        const gameBoard = {headers: ["Pokemon","Countries","Sports Logos", "Game Logos", "World Wonders"],
                        easy: ["Pikachu","United States","Steelers","Borderlands","Eiffel Tower"],
                        medium: ["Blaziken","Japan","Knicks","Overwatch","Colosseum"],
                        hard: ["Bastiodon","Afganistan","Falcons","Skyrim","Petra"]}

        if(roomSnapshot.exists()){

            const currentData = roomSnapshot.data()
            let starterPointsObject = {}
            for(let i = 0; i < currentData.members.length; i++){
                starterPointsObject[currentData.members[i]] = 0;
            }
            await setDoc(roomsDocRef,{
                members: currentData.members,
                gamemaster: currentData.gamemaster,
                round: 1,
                time: 60,
                inprogress: true,
                points: starterPointsObject,
                gameboard: gameBoard
            })

        }else{
            alert("ERROR, room somehow doesn't exist...")
            return
        }


        //the above SHOULD trigger a onShapshot listener for all the other people in the lobby, and they change state to the drawingBoard too.

        //change state for our user maybe
        setGameStarted(true)

    }

    async function startGameListener(){
        const unsub = onSnapshot(doc(db, 'rooms', props.roomCode), async (doc) => {
          setGameStarted(doc.data().inprogress)
        });
    }

    //useeffect for the startgame listener and pre-loading
    useEffect(()=>{
        startGameListener();
      }, [])

    //useeffect for an unloading listener
    useEffect(() => {
        const handleBeforeUnload = async () => {
        
            //remove name from database
            const roomsCollectionRef = collection(db, "rooms");
            const roomsDocRef = doc(roomsCollectionRef, props.roomCode)
            const roomSnapshot = await getDoc(roomsDocRef)

            if(roomSnapshot.exists()){

                //get index of user to be deleted
                const currentData = roomSnapshot.data()
                var index = currentData.members.indexOf(props.username);
                delete currentData.points[props.username]

                //the game ticks off of the gamemaster's clock, so we need to see if this person is the gamemaster. if so we need to pick a new one
                let gamemaster = currentData.gamemaster
                

                if (index !== -1) {
                    if(currentData.gamemaster == currentData.members[index]){
                        
                        currentData.members.splice(index, 1);
                        if(currentData.members.length == 0){
                            //TODO: CLEAN UP THE LOBBY IS IT'S DEAD!
                            console.log("No more members left... need to clean up")
                            return
                        }
                        gamemaster = currentData.members[0]
                    }else{
                        currentData.members.splice(index, 1);
                    }
                    
                }else{
                    return
                }
                
                
                
                
                await setDoc(roomsDocRef,{
                    members: currentData.members,
                    gamemaster: gamemaster,
                    round: currentData.round,
                    time: currentData.time,
                    inprogress: currentData.inprogress,
                    points: currentData.points,
                    gameboard: currentData.gameboard
                })

            }
            else{
                alert("ERROR, room somehow doesn't exist...")
                return
            }

        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };

    }, []);

    async function getGameMaster(){
        
        //TODO: very bad for cost-effecitvenss
        const unsub = onSnapshot(doc(db, 'rooms', props.roomCode), (doc) => {
            console.log(doc.data().gamemaster, props.username, doc.data().gamemaster == props.username)
            setIsGameMaster(doc.data().gamemaster == props.username);
          });
    }

    useEffect(()=>{

        getGameMaster()

    },[])
    

    return (

        gameStarted == false ? 
        
        <>
            <div className="lobby-container">
                <div className='lobby-header'>
                    <h1>Room: {props.roomCode}</h1>
                    <h2>Waiting for players to begin</h2>
                </div>
                <div className='lobby-playerlist'>
                    <PlayerList roomCode={props.roomCode}/>
                </div>
                <div>
                    <button onClick={handleStartGame}>Start Game!</button>
                </div>
                
            </div>
        </>

        :
        <>
            {(isGameMaster == true) ? 
            
            
            
            <>

                <HostScreen roomCode={props.roomCode} username={props.username} isGameMaster={isGameMaster}/>
            </>
            :
            <>
                <PlayerList roomCode={props.roomCode} username={props.username} isGameMaster={isGameMaster}/>
                <DrawingBoard roomCode={props.roomCode} username={props.username} isGameMaster={isGameMaster}/>
            </>

            }
        </>
        
        
    )
}

export default Lobby
