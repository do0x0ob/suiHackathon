//Type
type RpcNode = {
  name: string;
  url: string;
  latency: number;
};

type Network = "mainnet" | "testnet" | "devnet";

type TokenInfo = {
  token: COIN;
  symbol: string;
  iconPath: string;
  isLST?: boolean;
};

type BasicCoin = "SUI" | "USDC" | "USDT" | "BUCK" | "EYES";

type SuiObjectResponse = any;


type TaskDescription = {
  description: string;
  format: number; // 0: Plaintext, 1: Markdown
  publish_time: number; // Unix timestamp in milliseconds
};

type Task = {
  reward_type: string;
  id: string;
  version: number;
  name: string;
  description: TaskDescription[];
  image_url: string;
  publish_date: string; // Unix timestamp in milliseconds
  creator: string; // address
  moderator: string; // address
  area: string;
  is_active: boolean; // true: active, false: inactive
  fund: string;
  reward_amount: number;
  task_sheets: any[]; // assuming task_sheets is an array of objects
  poc_img_url: string;
  previousTransaction: string;
};

type TaskSheet = {
  data: {
    content: {
      dataType: string;
      fields: any;
    };
    fields: {
      annotation?: string | null;
      content?: string | null;
      created_time: string;
      creator: string;
      id: {
        id: string;
      };
      main_task_id: string;
      moderator: string;
      status: number;
      task_description: TaskDescription;
      update_time: string;
    };
    hasPublicTransfer: boolean;
    digest: string;
    previousTransaction: string;
  };
};

type TaskAdminCap = {
  data: {
      objectId: string,
      version: string,
      digest: string,
      type: string,
      content: {
          dataType: string,
          type: string,
          hasPublicTransfer: boolean,
          fields: {
              id: {
                  id: string
              }
          }
      }
  }
}

interface TaskSheetArr {
  data: {
    content: {
      dataType: string;
      fields: {
        annotation: string | null;
        content: string;
        created_time: string;
        creator: string;
        id: {
          id: string;
        };
        main_task_id: string;
        moderator: string;
        status: number;
        subtask_description: string;
        update_time: string;
      };
    };
    digest: string;
    objectId: string;
    previousTransaction: string;
    version: string;
  };
}

interface TaskAdminCapArr {
  data: {
    content: {
      dataType: string;
      fields: {
        id: {
          id: string;
        };
      };
      hasPublicTransfer: boolean;
      type: string;
      };
    digest: string;
    objectId: string
    type: string;
    version: string;
    previousTransaction: string;
    };
  };

interface ModCapArr {
  data: {
      objectId: string;
      version: string;
      digest: string;
      type: string;
      previousTransaction: string;
      content: {
          dataType: string;
          type: string;
          hasPublicTransfer: boolean;
          fields: {
              id: {
                  id: string;
              }
          }
      }
  }
}

interface TaskSheetPendingReview {
  data: {
    content: {
      dataType: string;
      fields: {
        annotation: string | null;
        content: string | null;
        created_time: string;
        creator: string;
        id: {
          id: string;
        };
        main_task_id: string;
        moderator: string;
        status: number;
        task_description: {
          fields: {
            description: string;
            format: number;
            publish_time: string;
            type: string;
            update_time: string;
          };
        };
      };
    };
    hasPublicTransfer: boolean;
    type: string;
    digest: string;
    previousTransaction: string;
    version: string;
  };
}