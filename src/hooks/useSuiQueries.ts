import { use, useContext } from "react";
import { AppContext } from "@/context/AppContext";
import { useSuiClientQuery } from "@mysten/dapp-kit";

const PACKAGE_ID = "0xd1d1f80291ce6017118d0ce521e19640b1118d592b740a32490ed8f4701adced";

export const useSuiQueries = () => {

    // Get User Wallet and Sui Name
    const { walletAddress, suiName } = useContext(AppContext);

    // Get User Balance
    const { data: suiBalance, refetch } = useSuiClientQuery('getBalance', {
        owner: walletAddress ?? '',
    });

    // Get All Coins From User Wallet
    const { data: allCoins, refetch: refetchAllCoins } = useSuiClientQuery('getAllCoins', {
        owner: walletAddress ?? '',
    });

    // Get All Coin Balances from User Wallet
    const { data: allCoinBalances, refetch: refetchAllCoinBalances} = useSuiClientQuery('getAllBalances', {
        owner: walletAddress ?? '',
    })

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

    // Get All AdminCaps from user wallet
    const { data: userAdminCaps, refetch: refetchUserAdminCaps } = useSuiClientQuery('getOwnedObjects', {
        owner: walletAddress ?? '',
        filter: {
            StructType: `${PACKAGE_ID}::public_task::AdminCap`
        },
        options:{
            showType: true,
            showContent: true,
            showPreviousTransaction: true
        },
    });

    return {
        suiBalance,
        refetch,
        allCoins,
        refetchAllCoins,
        allCoinBalances,
        refetchAllCoinBalances,
        userTaskSheets,
        refetchUserTaskSheets,
        userModCaps,
        refetchUserModCaps,
        userAdminCaps,
        refetchUserAdminCaps
    };
};