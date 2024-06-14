import { useContext } from "react";
import { AppContext } from "@/context/AppContext";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { Wallet } from "lucide-react";

const PACKAGE_ID = 
    // "0x442c18c27862e428edf50700541153f1ff430d240ff3e51df7952377198975e7"; // devnet
    "0xc8e76738b2a255fe5a093a39f1eaa3b3ab869efcd62e4705c8790ceb7a532f02"; //testnet

const SUIFRENS_PACKAGE_ID = "0x80d7de9c4a56194087e0ba0bf59492aa8e6a5ee881606226930827085ddf2332";

export const useSuiQueries = () => {

    // Get User Wallet and Sui Name
    const { walletAddress, suiName } = useContext(AppContext);

    // Get User Balance
    const { data: suiBalance, refetch } = useSuiClientQuery('getBalance', {
        owner: walletAddress ?? '',
    });

    // Get All Coins From User Wallet
    const { data: allCoins } = useSuiClientQuery('getAllCoins', {
        owner: walletAddress ?? '',
    });

    // Get All Task Sheets from User Wallet
    const { data: userTaskSheets, refetch: refetchUserTaskSheets } = useSuiClientQuery('getOwnedObjects', {
        owner: walletAddress ?? '',
        filter: {
            StructType: `${PACKAGE_ID}::public_task::TaskSheet`,
        },
        options: {
            showType: true,
            showContent: true,
            showPreviousTransaction: true,
        },
    });

    // Get All ModCaps from Uder Wallet
    const { data: userModCaps, refetch: refetchUserModCaps } = useSuiClientQuery('getOwnedObjects', {
        owner: walletAddress ?? '',
        filter: {
            StructType: `${PACKAGE_ID}::public_task::ModCap`,
        },
        options:{
            showType: true,
            showContent: true,
            showPreviousTransaction: true,
        },
    });

    // Get All SuiFren NFT object id from user wallet //FIXME: return undefined
    const { data: userSuifrens, refetch: refetchUserSuifrens } = useSuiClientQuery('getOwnedObjects', {
        owner: walletAddress ?? '',
        options:{
            showContent: true
        }
    });

    return {
        suiBalance,
        refetch,
        allCoins,
        userTaskSheets,
        refetchUserTaskSheets,
        userModCaps,
        refetchUserModCaps,
        userSuifrens,
        refetchUserSuifrens
    };
};