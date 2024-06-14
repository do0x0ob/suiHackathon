import { useContext, useEffect, useMemo, useState, ChangeEvent } from "react";
import {
  useAccounts,
  useSignAndExecuteTransactionBlock,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { AppContext } from "@/context/AppContext";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui.js/utils";
import { SUIFREN_DISPLAY_API } from "../../constants/networkList"
import { toast } from "react-toastify";
import { showToast } from "../ui/linkToast";
import { checkWalletConnection } from "../../lib/transactionUtils";
import SuifrensCard from "../ui/suifrensCard"
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Image,
  Button,
  Modal,
  Input,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Tabs,
  Tab,
  Divider,
  ScrollShadow,
  Link,
  CheckboxGroup,
  Checkbox,
  Textarea,
  user,
} from "@nextui-org/react";
import { log } from "console";
import "tailwindcss/tailwind.css";
import { json } from "stream/consumers";
import { useSuiQueries } from "../../hooks/useSuiQueries";

const BasicContainer = () => {
  const {
    isOpen: isOpenModal1,
    onOpen: onOpenModal1,
    onOpenChange: onOpenChangeModal1,
  } = useDisclosure();
  const {
    isOpen: isOpenModal2,
    onOpen: onOpenModal2,
    onOpenChange: onOpenChangeModal2,
  } = useDisclosure();
  const {
    isOpen: isOpenModal3,
    onOpen: onOpenModal3,
    onOpenChange: onOpenChangeModal3,
  } = useDisclosure();
  const {
    isOpen: isOpenModal4,
    onOpen: onOpenModal4,
    onOpenChange: onOpenChangeModal4,
  } = useDisclosure();

  // version 20240527
  const PACKAGE_ID =
    //"0x442c18c27862e428edf50700541153f1ff430d240ff3e51df7952377198975e7"; // Devnet
    "0xc8e76738b2a255fe5a093a39f1eaa3b3ab869efcd62e4705c8790ceb7a532f02"; // Testnet
  const TASK_MANAGER_ID =
    //"0xd879ec6a7d5388d7ebffaea174827837ec1833f39137be2decad50dcc66139f0"; // Devnet
    "0x72870ade30d601c9367d22813940d5b584205b360307a4a65d268dbf12e31bbb"; // Testnet

  const FLOAT_SCALING = 1000000000;
  const DEVNET_EXPLORE = "https://suiscan.xyz/testnet/tx/";
  const DEVNET_EXPLOR_OBJ = "https://suiscan.xyz/testnet/object/";
  const { walletAddress, suiName } = useContext(AppContext);
  const {
    suiBalance,
    refetch,
    allCoins,
    userTaskSheets,
    refetchUserTaskSheets,
    userModCaps,
    refetchUserModCaps,
    userSuifrens,
    refetchUserSuifrens
  } = useSuiQueries();
  const jsonStrUserModCaps = JSON.stringify(userModCaps);
  const jsonStrUserTaskSheets = JSON.stringify(userTaskSheets, null, 2);
  const client = useSuiClient();
  const [account] = useAccounts();
  const { mutate: signAndExecuteTransactionBlock } =
    useSignAndExecuteTransactionBlock();
  const truncateAddress = (address: string | any[]) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  const userBalance = useMemo(() => {
    if (suiBalance?.totalBalance) {
      return Math.floor(Number(suiBalance?.totalBalance) / 10 ** 9);
    } else {
      return 0;
    }
  }, [suiBalance]);

  const [newTask, setNewTask] = useState({
    reward_type: "",
    name: "",
    description: "",
    format: 1,
    image_url: "",
    area: "",
    is_active: true,
    reward_amount: "",
    poc_img_url: "",
    creator: "",
    moderator: "",
    fund: "",
  });
  const [selectedToken, setSelectedToken] = useState<string>("SUI");
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Task[]>([]);
  const [publishedTasks, setPublishedTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskSheetDescription, setTaskSheetDescription] = useState("");
  const [taskFund, setTaskFund] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [annotation, setAnnotation] = useState("");
  const [processedTaskSheets, setProcessedTaskSheets] = useState<TaskSheet[]>([]);
  // select task (for Modal use)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filteredTaskSheets, setFilteredTaskSheets] = useState<TaskSheetPendingReview[]>([]);
  const [suiFrenSvg, setSuiFrenSvg] = useState<string | null>(null); //TODO: New SuiFren svg

  // Set Accepted Tasks Data From Task Sheets Owned by User
  const handleMatchAndSetAcceptedTasks = (
    userTaskSheets: TaskSheet[],
    allTasks: Task[],
  ) => {
    console.log("allTasks", allTasks);
    const matchedTasks: Task[] = [];
    const seenTaskIds = new Set<String>();

    userTaskSheets.forEach((taskSheet) => {
      if (taskSheet.data && taskSheet.data.fields) {
        const mainTaskId = taskSheet.data.fields.main_task_id;
        const matchedTask = allTasks.find((task) => task.id === mainTaskId);
        if (matchedTask && !seenTaskIds.has(matchedTask.id)) {
          matchedTasks.push(matchedTask);
          seenTaskIds.add(matchedTask.id);
        }
      } else {
        console.warn("Task sheet data or fields is undefined:", taskSheet);
      }
    });
    setAcceptedTasks(matchedTasks);
  };

  // Get ObjectIDS in TaskManager
  async function fetchTaskList() {
    try {
      const taskManagerObject = await client.getObject({
        id: TASK_MANAGER_ID,
        options: {
          showContent: true,
        },
      });

      const jsonString = JSON.stringify(taskManagerObject, null, 2);
      const jsonObject = JSON.parse(jsonString);
      const publishedTaskIdsArr =
        jsonObject.data.content.fields.published_tasks;

      return publishedTaskIdsArr;
    } catch (error) {
      console.error("Error fetching or converting task manager object:", error);
      return [];
    }
  }

  // Get objects data for eash item in `publishedTaskIdsArr`
  async function fetchAllTaskList() {
    try {
      console.log("userSuifrens(now all):", userSuifrens);//FIXME: testuse only
      console.log("userModCaps:", userModCaps); //FIXME: testuse only
      const publishedTaskIdsArr = await fetchTaskList();

      const objectsResponse = await client.multiGetObjects(
        {
          ids: publishedTaskIdsArr,
          options: {
            showContent: true,
            showPreviousTransaction: true,
          },
        }
      );
      return objectsResponse;
    } catch (error) {
      console.error("Error fetching multiple objects:", error);
      return null;
    }
  }

  // Apply Onchain object Data to ts Type structure, and set as PublishedTasks
  function transformData(apiData: SuiObjectResponse[]): Task[] {
    if (!apiData) return [];

    return apiData.map((item) => {
      const fields = item.data.content.fields;
      const type = item.data.content.type;
      const descriptionField = fields.description[0].fields;
      const previoustx = item.data.previousTransaction;

      return {
        reward_type: (type.match(/<([^>]+)>/) || [])[1] || "",
        id: fields.id.id,
        version: fields.version,
        name: fields.name,
        description: [
          {
            description: descriptionField.description,
            format: parseInt(descriptionField.format),
            publish_time: parseInt(descriptionField.publish_time),
          },
        ],
        image_url: fields.image_url,
        publish_date: fields.publish_date.toString(),
        creator: fields.creator,
        moderator: fields.moderator,
        area: fields.area,
        is_active: fields.is_active,
        fund: fields.fund,
        reward_amount: parseFloat(fields.reward_amount),
        task_sheets: fields.task_sheets,
        poc_img_url: fields.poc_img_url,
        previousTransaction: previoustx,
      };
    });
  }

  async function fetchAllTaskData() {
    const apiData = await fetchAllTaskList();
    if (apiData) {
      const transformedData = transformData(apiData);
      setAllTasks(transformedData);
    }
  }

  async function fetchAcceptedTask(userTaskSheets: any): Promise<TaskSheet[]> {
    if (userTaskSheets && userTaskSheets.data) {
      refetchUserTaskSheets();
      const jsonString = JSON.stringify(userTaskSheets, null, 2);
      const jsonObject = JSON.parse(jsonString);

      if (Array.isArray(jsonObject.data)) {
        const usertaskSheets: TaskSheet[] = jsonObject.data
          .map((item: any) => {
            if (
              item &&
              item.data &&
              item.data.content &&
              item.data.content.fields &&
              item.data.digest // 確保存在 digest 屬性
            ) {
              return {
                data: {
                  digest: item.data.digest, // 提取 digest 屬性
                  fields: item.data.content.fields,
                },
              };
            } else {
              console.warn("Item or fields is undefined:", item);
              return null;
            }
          })
          .filter((item: TaskSheet | null) => item !== null) as TaskSheet[];
          return usertaskSheets;
        }
      }
    return [];
  }

  async function loadAcceptedTasks() {
    if (userTaskSheets) {
      const userTaskSheetsData = await fetchAcceptedTask(userTaskSheets);
      handleMatchAndSetAcceptedTasks(userTaskSheetsData, allTasks);
    }
  }

  // Accept Task //FIXME: Here
  const handleAcceptTask = async (selectedTask: Task) => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    const txb = new TransactionBlock();
    txb.moveCall({
      target: `${PACKAGE_ID}::public_task::mint_task_sheet`,
      arguments: [txb.object(selectedTask.id), txb.pure(SUI_CLOCK_OBJECT_ID)],
      typeArguments: [selectedTask.reward_type],
    });

    txb.setSender(account.address);
    const dryrunRes = await client.dryRunTransactionBlock({
      transactionBlock: await txb.build({ client: client }),
    });
    console.log(dryrunRes);

    if (dryrunRes.effects.status.status === "success") {
      signAndExecuteTransactionBlock(
        {
          transactionBlock: txb,
          options: {
            showEffects: true,
          },
        },
        {
          onSuccess: async (res) => {
            try {
              const digest = await txb.getDigest({ client: client });
              const explorerUrl = `${DEVNET_EXPLORE + digest}`;
              showToast("Task Accepted", explorerUrl);
              console.log(`Transaction Digest`, digest);
              setAcceptedTasks((prevTasks) => {
                const updatedTasks = [...prevTasks, selectedTask];
                return updatedTasks;
              });
            } catch (digestError) {
              if (digestError instanceof Error) {
                toast.error(
                  `Transaction sent, but failed to get digest: ${digestError.message}`,
                );
              } else {
                toast.error(
                  "Transaction sent, but failed to get digest due to an unknown error.",
                );
              }
            }
            refetch();
            refetchUserTaskSheets();
            console.log(refetchUserTaskSheets());
          },
          onError: (err) => {
            toast.error("Tx Failed!");
            console.log(err);
          },
        },
      );
    } else {
      toast.error("Something went wrong");
    }
    setSelectedTask(null);
  };

  // Publish Public Tasks
  const handlePublishTaskChain = async () => {
    if (!checkWalletConnection(account)) return;

    const txb = new TransactionBlock();

    txb.moveCall({
      target: `${PACKAGE_ID}::public_task::publish_task`,
      arguments: [
        txb.pure.string(newTask.name),
        txb.pure.string(newTask.description),
        txb.pure(newTask.format),
        txb.pure.string(newTask.image_url),
        txb.pure(SUI_CLOCK_OBJECT_ID),
        txb.pure.string(newTask.area),
        txb.pure(true),
        txb.pure.address(newTask.moderator),
        txb.object(newTask.fund),
        txb.pure(parseFloat(newTask.reward_amount) * FLOAT_SCALING),
        txb.pure.string(newTask.poc_img_url),
        txb.pure(TASK_MANAGER_ID),
      ],
      typeArguments: [newTask.reward_type],
    });

    txb.setSender(account.address);

    const dryrunRes = await client.dryRunTransactionBlock({
      transactionBlock: await txb.build({ client: client }),
    });

    console.log(dryrunRes);

    if (dryrunRes.effects.status.status !== "success") {
      toast.error("Something went wrong");
      return;
    }

    await signAndExecuteTransactionBlock(
      {
        transactionBlock: txb,
        options: {
          showEffects: true,
        },
      },
      {
        onSuccess: async (res) => {
          try {
            const created = res.effects?.created;
            if (!created || created.length === 0) {
              throw new Error("No object created.");
            }

            const createdObject =
              created.find((obj) => obj.owner !== account.address)?.reference
                ?.objectId || created[0].reference?.objectId;

            if (!createdObject) {
              throw new Error("Created object ID is not a string.");
            }

            console.log(createdObject);

            const digest = await txb.getDigest({ client: client });
            const explorerUrl = `${DEVNET_EXPLORE + digest}`;
            showToast("Task Published", explorerUrl);
            console.log(`Transaction Digest`, digest);

            const newTaskObject = {
              reward_type: newTask.reward_type,
              id: createdObject,
              version: 1,
              name: newTask.name,
              description: [
                {
                  description: newTask.description,
                  format: 0, // Default to plaintext
                  publish_time: Date.now(),
                },
              ],
              image_url: newTask.image_url,
              publish_date: SUI_CLOCK_OBJECT_ID,
              creator: account.address,
              moderator: newTask.moderator,
              area: newTask.area,
              is_active: true,
              fund: newTask.fund,
              reward_amount: parseInt(newTask.reward_amount),
              task_sheets: [],
              poc_img_url: newTask.poc_img_url,
              previousTransaction: "",
            };

            setPublishedTasks((prevTasks) => [...prevTasks, newTaskObject]);

            setNewTask({
              reward_type: "",
              name: "",
              description: "",
              format: 0,
              image_url: "",
              area: "",
              reward_amount: "",
              poc_img_url: "",
              creator: "",
              moderator: "",
              fund: "",
              is_active: true,
            });
          } catch (digestError) {
            if (digestError instanceof Error) {
              toast.error(
                `Transaction sent, but failed to get digest: ${digestError.message}`,
              );
            } else {
              toast.error(
                "Transaction sent, but failed to get digest due to an unknown error.",
              );
            }
          }
          refetch();
          fetchAllTaskData();
          await loadAcceptedTasks();
        },
        onError: (err) => {
          toast.error("Transaction Failed!");
          console.log(err);
        },
      },
    );

    console.log("New task published:", newTask);
  };

  //打開回報任務完成Modal
  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
    onOpenModal4();
    console.log("Send Task Sheet", task);
  };

  // Get Relate TaskSheetAndCap
  const getRelateTaskSheetAndCap = async (selectedTaskID: string) => {

    refetchUserTaskSheets();
    
    const jsonObjUserTaskSheet = JSON.parse(jsonStrUserTaskSheets);
    const userTaskSheetArray = jsonObjUserTaskSheet.data;

  
    const relateTaskSheet: TaskSheet | undefined = userTaskSheetArray.find(
      (tasksheet: TaskSheetArr) => 
        tasksheet.data.content.fields.main_task_id.includes(selectedTaskID)
    );

    if (!relateTaskSheet) {
      console.error("No matching TaskSheet found for selectedTaskID:", selectedTaskID);
      throw new Error("No matching TaskSheet found");
    }

    const relateTaskSheetId = relateTaskSheet.data.content.fields.id.id;

    return { relateTaskSheetId };
  };

   // Edit and submit_task_sheet
  const handleSendTaskSheet = async (selectedTaskID: string, description: string) => {
    if (!checkWalletConnection(account)) return;
    /*if (description === "") {
      toast.error("Description cannot be empty");
      return}*/
  
    try {
      const { relateTaskSheetId } = await getRelateTaskSheetAndCap(selectedTaskID);
      
      const txb = new TransactionBlock();
      txb.moveCall({
        target: `${PACKAGE_ID}::public_task::edit_and_submit_task_sheet`,
        arguments: [
          txb.pure(relateTaskSheetId),
          txb.pure(description),
          txb.pure(SUI_CLOCK_OBJECT_ID),
        ],
      });

      txb.setSender(account.address);
      const dryrunRes = await client.dryRunTransactionBlock({
        transactionBlock: await txb.build({ client: client }),
      });

      if (dryrunRes.effects.status.status === "success") {
        await signAndExecuteTransactionBlock(
          { transactionBlock: txb, options: { showEffects: true } },
          {
            onSuccess: async (res) => {
              const digest = await txb.getDigest({ client: client });
              const explorerUrl = `${DEVNET_EXPLORE + digest}`;
              showToast("Task Sheet Submitted", explorerUrl);
              refetch();
              refetchUserTaskSheets();
              fetchAllTaskData();
              setTaskSheetDescription("");
            },
            onError: (err) => {
              toast.error("Tx Failed!");
              console.error(err);
            },
          }
        );
      } else {
        toast.error("Something went wrong");
      }
      setSelectedTask(null);
    } catch (error) {
      console.error("Error handling task sheet submit", error);
    }
  };

  const handleTaskSheetDetails = async (selectedTaskID: string, description: string) => {
    if (!checkWalletConnection(account)) return;
  
    if (description === "") {
      toast.error("Description cannot be empty");
      return;
    }

    try {
      const { relateTaskSheetId } = await getRelateTaskSheetAndCap(selectedTaskID);
  
      const txb = new TransactionBlock();
      txb.moveCall({
        target: `${PACKAGE_ID}::public_task::update_task_sheet_content`,
        arguments: [
          txb.pure(relateTaskSheetId),
          txb.pure(description),
          txb.pure(SUI_CLOCK_OBJECT_ID),
          //txb.pure(relatedTaskAdminCapID),
        ],
      });

      txb.setSender(account.address);
      const dryrunRes = await client.dryRunTransactionBlock({
        transactionBlock: await txb.build({ client: client }),
      });

      if (dryrunRes.effects.status.status === "success") {
        await signAndExecuteTransactionBlock(
          { transactionBlock: txb, options: { showEffects: true } },
          {
            onSuccess: async (res) => {
              try {
                const digest = await txb.getDigest({ client: client });
                const explorerUrl = `${DEVNET_EXPLORE + digest}`;
                showToast("Task Sheet Updated", explorerUrl);
                refetch();
                fetchAllTaskData();
              } catch (digestError) {
                if (digestError instanceof Error) {
                  toast.error(`Transaction sent, but failed to get digest: ${digestError.message}`);
                } else {
                  toast.error("Transaction sent, but failed to get digest due to an unknown error.");
                }
              }
            },
            onError: (err) => {
              toast.error("Tx Failed!");
              console.error(err);
            },
          }
        );
      } else {
        toast.error("Something went wrong");
      }
      console.log("Task Sheet Details", selectedTaskID, description);
    } catch (error) {
      console.error("Error handling task sheet details", error);
    }
  };

  //打開發任務者編輯已發布任務的Modal
  const handleModifyTask = (task: Task) => {
    setSelectedTask(task);
    onOpenModal3();
    console.log(task);
  };

  //增加獎池資金 | add_task_fund<T>;
  const handleAddTaskFund = (selectedTaskID: string, fund: number) => {
    /* if (!checkWalletConnection(account)) return;

        const txb = new TransactionBlock();
        console.log(selectedTask);
        txb.moveCall({
          target: `${PACKAGE_ID}::public_task::add_task_fund`,
          arguments: [
            txb.object(
              selectedTaskId
            ),
            txb.pure(SUI_CLOCK_OBJECT_ID),
            txb.pure(fund),
          ],
          typeArguments: ["0x2::sui::SUI"],
        });

        txb.setSender(account.address);
        const dryrunRes = await client.dryRunTransactionBlock({
          transactionBlock: await txb.build({ client: client }),
        });
        console.log(dryrunRes);

        if (dryrunRes.effects.status.status === "success") {
          signAndExecuteTransactionBlock(
            {
              transactionBlock: txb,
              options: {
                showEffects: true,
              },
            },
            {
              onSuccess: async (res) => {
                try {
                  const digest = await txb.getDigest({ client: client });
                  showToast("Task Fund Added", explorerUrl);
                  console.log(`Transaction Digest`, digest);
                } catch (digestError) {
                  if (digestError instanceof Error) {
                    toast.error(
                      `Transaction sent, but failed to get digest: ${digestError.message}`
                    );
                  } else {
                    toast.error(
                      "Transaction sent, but failed to get digest due to an unknown error."
                    );
                  }
                }
                refetch();
                fetchData();
              },
              onError: (err) => {
                toast.error("Tx Failed!");
                console.log(err);
              },
            }
          );
        } else {
          toast.error("Something went wrong");
        }*/
    if (selectedTask) {
      toast.success(`${selectedTaskID} ${"任務基金已增加"} ${fund} SUI`);
      setSelectedTask(null);
    }
  };
  //取出獎池資金 | retrieve_task_fund<T>
  const handleTakeTaskFund = (selectedTaskID: string, fund: number) => {
    /*  if (!checkWalletConnection(account)) return;
        const txb = new TransactionBlock();
        console.log(selectedTask);
        txb.moveCall({
          target: `${PACKAGE_ID}::public_task::retrieve_task_fund`,
          arguments: [
            txb.object(
              selectedTaskId
            ),
            txb.pure(SUI_CLOCK_OBJECT_ID),
            txb.pure(fund),
          ],
          typeArguments: ["0x2::sui::SUI"],
        });

        txb.setSender(account.address);
        const dryrunRes = await client.dryRunTransactionBlock({
          transactionBlock: await txb.build({ client: client }),
        });
        console.log(dryrunRes);

        if (dryrunRes.effects.status.status === "success") {
          signAndExecuteTransactionBlock(
            {
              transactionBlock: txb,
              options: {
                showEffects: true,
              },
            },
            {
              onSuccess: async (res) => {
                try {
                  const digest = await txb.getDigest({ client: client });
                  showToast("Task Fund Retrieved", explorerUrl);
                  console.log(`Transaction Digest`, digest);
                } catch (digestError) {
                  if (digestError instanceof Error) {
                    toast.error(
                      `Transaction sent, but failed to get digest: ${digestError.message}`
                    );
                  } else {
                    toast.error(
                      "Transaction sent, but failed to get digest due to an unknown error."
                    );
                  }
                }
                refetch();
                fetchData();
              },
              onError: (err) => {
                toast.error("Tx Failed!");
                console.log(err);
              },
            }
          );
        } else {
          toast.error("Something went wrong");
        }*/
    if (selectedTask) {
      toast.success(`${selectedTaskID} ${"任務基金已提取"} ${fund} SUI`);
      setSelectedTask(null);
    }
  };
  //更新任務描述 | update_task_description<T>
  const handleTaskDescription = (
    selectedTaskID: string,
    description: string,
  ) => {
    /* if (!checkWalletConnection(account)) return;
        const txb = new TransactionBlock();
        console.log(selectedTask);
        txb.moveCall({
          target: `${PACKAGE_ID}::public_task::update_task_description`,
          arguments: [
            txb.object(
              selectedTaskId
            ),
            txb.pure(SUI_CLOCK_OBJECT_ID),
            txb.pure(description),
          ],
          typeArguments: ["0x2::sui::SUI"],
        });

        txb.setSender(account.address);
        const dryrunRes = await client.dryRunTransactionBlock({
          transactionBlock: await txb.build({ client: client }),
        });
        console.log(dryrunRes);

        if (dryrunRes.effects.status.status === "success") {
          signAndExecuteTransactionBlock(
            {
              transactionBlock: txb,
              options: {
                showEffects: true,
              },
            },
            {
              onSuccess: async (res) => {
                try {
                  const digest = await txb.getDigest({ client: client });
                  showToast("Task Description Updated", explorerUrl);
                  console.log(`Transaction Digest`, digest);
                } catch (digestError) {
                  if (digestError instanceof Error) {
                    toast.error(
                      `Transaction sent, but failed to get digest: ${digestError.message}`
                    );
                  } else {
                    toast.error(
                      "Transaction sent, but failed to get digest due to an unknown error."
                    );
                  }
                }
                refetch();
                fetchData();
              },
              onError: (err) => {
                toast.error("Tx Failed!");
                console.log(err);
              },
            }
          );
        } else {
          toast.error("Something went wrong");
        }*/
    console.log("Task Sheet Details", selectedTaskID, description);
    toast.success("Task Description Updated");
  };

  //管理已提交任務打開 Modal
  const handleSubmittedTask = (task: Task) => {
    setSelectedTask(task);
    console.log("Submitted Task", task);
    onOpenModal2();
  };

  //紀錄選取了哪些任務單
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected([...selected, e.target.value]);
    } else {
      setSelected(selected.filter((item) => item !== e.target.value));
    }
  };

  // approve_and_send_reward<T>
  const handleApprove = async (
    annotation: string,
    selectedTaskId: string,
    selectedTaskSheets: string[],
  ) => {
    if (!checkWalletConnection(account)) return;

    try {
      if (!userModCaps) {
        throw new Error("UserModCaps is undefined");
      }
      
      refetchUserModCaps();
      const jsonObjUserModCaps = JSON.parse(jsonStrUserModCaps);
      const userModCapsArray = jsonObjUserModCaps.data;
      //console.log("publishedTasks:::",allTasks)

      // find Related Task
      const selectedTaskForReject = allTasks.find((task) => task.id === selectedTaskId);
        if (!selectedTaskForReject) {
          throw new Error("Selected task not found");
        }

        const res = await client.queryTransactionBlocks({
          filter: { ChangedObject: selectedTaskId },
        });
        const taskLastDataDigest = res.data[res.data.length - 1].digest;

        let relatedModCap: any;
        for (const modCap of userModCapsArray) {
          const ModCapLatestDigest = (
            await client.queryTransactionBlocks({
              filter: { ChangedObject: modCap.data.objectId },
            })
          ).data.slice(-1)[0].digest;

        if (ModCapLatestDigest === taskLastDataDigest) {
          relatedModCap = modCap;
          break;
        }
      }

      if (!relatedModCap) {
        toast.error("You are not assigned as a Task Moderator for this task");
        throw new Error("Related modCap not found");
      }

      const relatedModCapId = relatedModCap.data.objectId;
      const rewardType = selectedTaskForReject.reward_type;
      const selectedTaskSheet = selectedTaskSheets[0].toString();

      console.log("Related ModCapId: ", relatedModCapId);
      console.log("selectedTaskId:", selectedTaskId, typeof selectedTaskId);
      console.log("selectedTaskSheet:", selectedTaskSheet, typeof selectedTaskSheets);

      const txb = new TransactionBlock();

      txb.moveCall({
        target: `${PACKAGE_ID}::public_task::approve_and_send_reward`,
        arguments: [
          txb.pure(selectedTaskId),
          txb.pure(selectedTaskSheet), // 需要寫一個 for 迴圈 txb.movecall 傳入迭代
          txb.pure(annotation),
          txb.pure(SUI_CLOCK_OBJECT_ID),
          txb.pure(relatedModCapId), // 需要從錢包中取得與 selectedTaskId 有相同 PreviousTransaction 的 admincap
        ],
        typeArguments: [rewardType], //從 alltask 中找 selectedTaskId 符合的 item 回傳 item<Task>.type
      });

      txb.setSender(account.address);
      const dryrunRes = await client.dryRunTransactionBlock({
        transactionBlock: await txb.build({ client: client }),
      });
      console.log(dryrunRes);

      if (dryrunRes.effects.status.status === "success") {
        signAndExecuteTransactionBlock(
          {
            transactionBlock: txb,
            options: {
              showEffects: true,
            },
          },
          {
            onSuccess: async (res) => {
              try {
                const digest = await txb.getDigest({ client: client });
                const explorerUrl = `${DEVNET_EXPLORE + digest}`;
                showToast("Task Sheet Approved", explorerUrl);
                console.log(`Transaction Digest`, digest);
              } catch (digestError) {
                if (digestError instanceof Error) {
                  toast.error(
                    `Transaction sent, but failed to get digest: ${digestError.message}`,
                  );
                } else {
                  toast.error(
                    "Transaction sent, but failed to get digest due to an unknown error.",
                  );
                }
              }
              refetch();
            },
            onError: (err) => {
              toast.error("Tx Failed!");
              console.log(err);
            },
          },
        );
      } else {
        toast.error("Something went wrong");
      }
      console.log(selectedTaskId, selected, annotation);
      //toast.success(`Task Sheet ${selected} is Approved`);
      //toast.success(`Note: ${annotation}`);
      setSelected([]);
      setAcceptedTasks(prevTasks => prevTasks.filter(task => task.id !== selectedTaskId));
    } catch (error) {
      console.error("Error handling task sheet details", error);
    }
  };

  // 認證不通過退回任務單 | reject_and_return_task_sheet
  const handleReject = async (
    annotation: string,
    selectedTaskId: string,
    selectedTaskSheets: string[],
  ) => {
    if (!checkWalletConnection(account)) return;

    try {
      if (!userModCaps) {
        throw new Error("UserModCaps is undefined");
      }
      refetchUserModCaps();
      const jsonObjUserModCaps = JSON.parse(jsonStrUserModCaps);
      const userModCapsArray = jsonObjUserModCaps.data;

      // find Related Task
      const selectedTask = allTasks.find((task) => task.id === selectedTaskId);
      if (!selectedTask) {
        throw new Error("Selected task not found");
      }

      const res = await client.queryTransactionBlocks({
        filter: { ChangedObject: selectedTaskId },
      });
      const taskLastDataDigest = res.data[res.data.length - 1].digest;

      let relatedModCap: any;
      for (const modCap of userModCapsArray) {
        const ModCapLatestDigest = (
          await client.queryTransactionBlocks({
            filter: { ChangedObject: modCap.data.objectId },
          })
        ).data.slice(-1)[0].digest;

        if (ModCapLatestDigest === taskLastDataDigest) {
          relatedModCap = modCap;
          break;
        }
      }

      if (!relatedModCap) {
        toast.error("You are not assigned as a Task Moderator for this task");
        throw new Error("Related modCap not found");
      }

      const relatedModCapId = relatedModCap.data.objectId;
      const selectedTaskSheet = selectedTaskSheets[0].toString();

      const txb = new TransactionBlock();

      txb.moveCall({
        target: `${PACKAGE_ID}::public_task::reject_and_return_task_sheet`,
        arguments: [
          txb.pure(selectedTaskSheet),
          txb.pure(annotation),
          txb.pure(SUI_CLOCK_OBJECT_ID),
          txb.pure(relatedModCapId),
        ],
      });

      txb.setSender(account.address);
      const dryrunRes = await client.dryRunTransactionBlock({
        transactionBlock: await txb.build({ client: client }),
      });
      console.log(dryrunRes);

      if (dryrunRes.effects.status.status === "success") {
        signAndExecuteTransactionBlock(
          {
            transactionBlock: txb,
            options: {
              showEffects: true,
            },
          },
          {
            onSuccess: async (res) => {
              try {
                const digest = await txb.getDigest({ client: client });
                const explorerUrl = `${DEVNET_EXPLORE + digest}`;
                showToast("Task Sheet Rejected", explorerUrl);
                console.log(`Transaction Digest`, digest);
              } catch (digestError) {
                if (digestError instanceof Error) {
                  toast.error(
                    `Transaction sent, but failed to get digest: ${digestError.message}`,
                  );
                } else {
                  toast.error(
                    "Transaction sent, but failed to get digest due to an unknown error.",
                  );
                }
              }
              refetchUserTaskSheets();
            },
            onError: (err) => {
              toast.error("Tx Failed!");
              console.log(err);
            },
          },
        );
      } else {
        toast.error("Something went wrong");
      }
      console.log(selectedTaskId, selected, annotation);
      //toast.warning(`Task Sheet ${selected} Denied`);
      //toast.warning(`Note: ${annotation}`);
      setSelected([]);
    } catch (error) {
      console.error("Error handling task sheet details", error);
    }
  };

  // TODO: here --suifrens svg hook
  useEffect(() => {
    const fetchSuiFrenSvg = async () => {
      try {
        // TODO: Get SuiFren Object id from userwallet



        //TODO: pass a constant while testing
        // const suifrenId = userSuifrens;
        const suifrenId = `0xfb572d4b05aa5de7d9d3a1352f72d0957aa3cb4c2f2ac8a548af98c105ddad3a`;
        const response = await fetch(`http://${SUIFREN_DISPLAY_API}/suifrens/${suifrenId}/svg`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const svgText = await response.text();
        setSuiFrenSvg(svgText);
        //console.log(svgText); //FIXME: test use only
      } catch (error) {
        console.error("Error fetching SuiFren SVG:", error);
      }
    };

    fetchSuiFrenSvg();
  }, []);


  useEffect(() => {
    fetchAllTaskData();
  }, []);

  // Data for Accepted Tasks
  useEffect(() => {
    //console.log('userTaskSheets or allTasks changed, loading accepted tasks...');
    loadAcceptedTasks();
  }, [userTaskSheets, allTasks]);

  
  // Data for Accepted Tasks
  useEffect(() => {
    if (processedTaskSheets.length > 0) {
      handleMatchAndSetAcceptedTasks(processedTaskSheets, allTasks);
    }
  }, [processedTaskSheets, allTasks]);

  // Data for Published Tasks
  useEffect(() => {
    if (allTasks.length > 0) {
      const filteredTasks = allTasks.filter(
        (task) =>
          task.creator === walletAddress || task.moderator === walletAddress,
      );
      setPublishedTasks(filteredTasks);
    }
  }, [allTasks, walletAddress]);

  // filtered Display for Pending Review TaskShets
  useEffect(() => {
    const fetchFilteredTaskSheets = async () => {
      if (selectedTask?.task_sheets) {
        try {
          const uniqueTaskSheets = Array.from(
            new Set(selectedTask.task_sheets),
          );
          const response: any = await client.multiGetObjects({
            ids: uniqueTaskSheets,
            options: {
              showContent: true,
            },
          });
          const responseObj: TaskSheetPendingReview[] = response;

          if (Array.isArray(responseObj)) {
            const filtered: TaskSheetPendingReview[] = responseObj.filter(
              (taskSheet) => taskSheet.data.content.fields.status === 1,
            );

            setFilteredTaskSheets(filtered);

          } else {
            console.error("Response is not an array or is empty");
            setFilteredTaskSheets([]);
          }
        } catch (error) {
          console.error("Failed to fetch task sheets:", error);
          setFilteredTaskSheets([]);
        }
      }
    };

    fetchFilteredTaskSheets();
  }, [selectedTask, selected]);
  return (
    <>
      {/*<Divider className="my-3"></Divider>*/}
      <div className="mx-auto pt-[150px] p-4 md:pt-32 lg:pt-40">
        {/* 渲染 SuiFren 圖像 //TODO: here render suifren*/}
        <div className='sui-fren-container'>
          <SuifrensCard suiFrenSvg={suiFrenSvg} />
        </div>
        <Button
          onPress={onOpenModal1}
          onClick={() => setSelectedTask(null)}
          size="lg"
          className="font-serif uppercase"
          color="secondary"
        >
          Publish Task
        </Button>
      </div>
      <div className="flex justify-center font-sans">
        <div className="flex w-full flex-col">
          <Tabs
            aria-label="Options"
            variant="bordered"
            className="min-h-1 mx-auto"
          >
            <Tab key="allTasks" title="All Tasks">
              <div className="max-w-[1200px] gap-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-10">
                {allTasks.map((task) => (
                  <Card
                    key={task.id}
                    isFooterBlurred
                    className="h-[660px] w-[320px] shadow-lg rounded-lg overflow-hidden mx-auto"
                  >
                    <CardBody className="relative p-3">
                      <Image
                        removeWrapper
                        alt="Task"
                        src={task.image_url}
                        className="z-0 w-full h-50 object-cover rounded-lg"
                      />
                    </CardBody>
                    <CardFooter className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black to-transparent text-white">
                      <div className="flex flex-grow gap-2 items-center">
                        <div className="flex flex-col gap-2 text-white/80">
                          <ScrollShadow
                            hideScrollBar
                            className="max-h-[280px] overflow-y-auto"
                          >
                            <h3 className="text-lg fint-semibold">
                              {task.name}
                            </h3>
                            <p>
                              <strong>Description:</strong>{" "}
                              {task.description[0].description}
                            </p>
                            <p>
                              <strong>Published:</strong>{" "}
                              {new Date(
                                parseInt(task.publish_date),
                              ).toLocaleString()}
                            </p>
                            <p>
                              <strong>Creator:</strong>{" "}
                              {truncateAddress(task.creator)}
                            </p>
                            <p>
                              <strong>MOD:</strong>{" "}
                              {truncateAddress(task.moderator)}
                            </p>
                            <p>
                              <strong>Area:</strong> {task.area}
                            </p>
                            <p>
                              <strong>Status:</strong>{" "}
                              {task.is_active ? "Active" : "Inactive"}
                            </p>
                            <p>
                              <strong>Reward Pool:</strong>{" "}
                              {parseFloat(task.fund) / FLOAT_SCALING}
                            </p>
                            <p>
                              <strong>Reward:</strong>{" "}
                              {task.reward_amount / FLOAT_SCALING}
                            </p>
                            <Link
                              isExternal
                              href={`https://suiscan.xyz/testnet/object/${task.id}`} //TODO: testnet URL here
                              showAnchorIcon
                            >
                              View on Blockchain
                            </Link>
                          </ScrollShadow>
                          <Button
                            isDisabled={!task.is_active}
                            onClick={() => handleAcceptTask(task)}
                            radius="full"
                            size="md"
                            className="text-white shadow-lg mt-6 w-[288px]"
                          >
                            Accept Task
                          </Button>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </Tab>
            <Tab key="acceptedTasks" title="On Going Tasks">
              <div className="max-w-[1200px] gap-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-10">
                {!acceptedTasks.length && (
                  <div className="flex justify-center items-center h-[660px] w-[320px] mx-auto col-span-full">
                    <Image
                      alt="voidfren"
                      src="/frens/voidfren.svg"
                      className="mb-20 w-[150px] h-[150px] object-cover rounded-lg"
                    />
                    <p className="text-white/80 text-center">
                      No accepted tasks
                    </p>
                  </div>
                )}
                {acceptedTasks.map((task) => (
                  <Card
                    key={task.id}
                    isFooterBlurred
                    className="h-[660px] w-[320px] shadow-lg rounded-lg overflow-hidden mx-auto"
                  >
                    <CardBody className="relative p-3">
                      <Image
                        removeWrapper
                        alt="Task"
                        src={task.image_url}
                        className="z-0 w-full h-50 object-cover rounded-lg"
                      />
                    </CardBody>
                    <CardFooter className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black to-transparent text-white">
                      <div className="flex flex-grow gap-2 items-center">
                        <div className="flex flex-col gap-2 text-white/80">
                          <ScrollShadow
                            hideScrollBar
                            className="max-h-[280px] overflow-y-auto"
                          >
                            <p>
                              <strong>Task Name:</strong> {task.name}
                            </p>
                            <p>
                              <strong>Description:</strong>{" "}
                              {task.description[0].description}
                            </p>
                            <p>
                              <strong>Published:</strong>{" "}
                              {new Date(
                                parseInt(task.publish_date),
                              ).toLocaleString()}
                            </p>
                            <p>
                              <strong>Creator:</strong>{" "}
                              {truncateAddress(task.creator)}
                            </p>
                            <p>
                              <strong>Moderator:</strong>{" "}
                              {truncateAddress(task.moderator)}
                            </p>
                            <p>
                              <strong>Area:</strong> {task.area}
                            </p>
                            <p>
                              <strong>Status:</strong>{" "}
                              {task.is_active ? "Active" : "Inactive"}
                            </p>
                            <p>
                              <strong>Fund:</strong>{" "}
                              {parseFloat(task.fund) / FLOAT_SCALING}
                            </p>
                            <p>
                              <strong>Reward Amount:</strong>{" "}
                              {task.reward_amount / FLOAT_SCALING}
                            </p>
                            <Link
                              isExternal
                              href={`https://suiscan.xyz/devnet/object/${task.id}`}
                              showAnchorIcon
                            >
                              View on Blockchain
                            </Link>
                          </ScrollShadow>
                          <Button
                            onPress={() => handleCompleteTask(task)}
                            radius="full"
                            size="md"
                            className="text-white shadow-lg mt-6 w-[288px]"
                          >
                            Submit Task
                          </Button>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </Tab>
            <Tab key="publishedTasks" title="Published by Me">
              <div className="max-w-[1200px] gap-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-10">
                {!publishedTasks.length && (
                  <div className="flex justify-center items-center h-[660px] w-[320px] mx-auto col-span-full">
                    <Image
                      alt="voidfren"
                      src="/frens/voidfren.svg"
                      className="mb-20 w-[150px] h-[150px] object-cover rounded-lg"
                    />
                    <p className="text-white/80 text-center">
                      No published tasks
                    </p>
                  </div>
                )}
                {publishedTasks.map((task) => (
                  <Card
                    key={task.id}
                    isFooterBlurred
                    className="h-[700px] w-[320px] shadow-lg rounded-lg overflow-hidden mx-auto"
                  >
                    <CardBody className="relative p-3">
                      <Image
                        removeWrapper
                        alt="Task"
                        src={task.image_url}
                        className="z-0 w-full h-50 object-cover rounded-lg"
                      />
                    </CardBody>
                    <CardFooter className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black to-transparent text-white">
                      <div className="flex flex-grow gap-2 items-center">
                        <div className="flex flex-col gap-2 text-white/80">
                          <ScrollShadow
                            hideScrollBar
                            className="max-h-[280px] overflow-y-auto"
                          >
                            <h3 className="text-lg fint-semibold">
                              {task.name}
                            </h3>
                            <p>
                              <strong>Description:</strong>{" "}
                              {task.description[0].description}
                            </p>
                            <p>
                              <strong>Published:</strong>{" "}
                              {new Date(
                                parseInt(task.publish_date),
                              ).toLocaleString()}
                            </p>
                            <p>
                              <strong>Creator:</strong>{" "}
                              {truncateAddress(task.creator)}
                            </p>
                            <p>
                              <strong>MOD:</strong>{" "}
                              {truncateAddress(task.moderator)}
                            </p>
                            <p>
                              <strong>Area:</strong> {task.area}
                            </p>
                            <p>
                              <strong>Status:</strong>{" "}
                              {task.is_active ? "Active" : "Inactive"}
                            </p>
                            <p>
                              <strong>Reward Pool:</strong>{" "}
                              {parseFloat(task.fund) / FLOAT_SCALING}
                            </p>
                            <p>
                              <strong>Reward:</strong>{" "}
                              {task.reward_amount / FLOAT_SCALING}
                            </p>
                            <Link
                              isExternal
                              href={`https://suiscan.xyz/devnet/object/${task.id}`}
                              showAnchorIcon
                            >
                              View on Blockchain
                            </Link>
                          </ScrollShadow>
                          <Button
                            onPress={() => handleModifyTask(task)}
                            radius="full"
                            size="md"
                            className="text-white shadow-lg mt-6 w-[288px]"
                          >
                            Manage Your Task
                          </Button>
                          <Button
                            onPress={() => handleSubmittedTask(task)}
                            radius="full"
                            size="md"
                            className="text-white shadow-lg w-[288px]"
                          >
                            View Submitted Tasks
                          </Button>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </Tab>
            {/*<Tab key="completedTasks" title="Completed Tasks">
              <div className="max-w-[1200px] gap-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-8 mb-10">
                {!completedTasks.length && (
                  <div className="flex justify-center items-center h-[660px] w-[320px] mx-auto col-span-full">
                    <Image
                      alt="voidfren"
                      src="/frens/voidfren.svg"
                      className="mb-20 w-[150px] h-[150px] object-cover rounded-lg"
                    />
                    <p className="text-white/80 text-center">
                      No Completed Tasks
                    </p>
                  </div>
                )}
                {completedTasks.map((task) => (
                  <Card
                    key={task.id}
                    isFooterBlurred
                    className="h-[660px] w-[320px] shadow-lg rounded-lg overflow-hidden"
                  >
                    <CardBody className="relative p-3">
                      <Image
                        removeWrapper
                        alt="Task"
                        src={task.image_url}
                        className="z-0 w-full h-50 object-cover rounded-lg"
                      />
                    </CardBody>
                    <CardFooter className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black to-transparent text-white">
                      <div className="flex flex-grow gap-2 items-center">
                        <div className="flex flex-col gap-2 text-white/80">
                          <ScrollShadow
                            hideScrollBar
                            className="max-h-[280px] overflow-y-auto"
                          >
                            <h3 className="text-lg fint-semibold">
                              {task.name}
                            </h3>
                            <p>
                              <strong>Description:</strong>{" "}
                              {task.description[0].description}
                            </p>
                            <p>
                              <strong>Published:</strong>{" "}
                              {new Date(
                                parseInt(task.publish_date)
                              ).toLocaleString()}
                            </p>
                            <p>
                              <strong>Creator:</strong>{" "}
                              {truncateAddress(task.creator)}
                            </p>
                            <p>
                              <strong>MOD:</strong>{" "}
                              {truncateAddress(task.moderator)}
                            </p>
                            <p>
                              <strong>Area:</strong> {task.area}
                            </p>
                            <p>
                              <strong>Status:</strong>{" "}
                              {task.is_active ? "Active" : "Inactive"}
                            </p>
                            <p>
                              <strong>Reward Pool:</strong>{" "}
                              {parseFloat(task.fund) / FLOAT_SCALING}
                            </p>
                            <p>
                              <strong>Reward:</strong>{" "}
                              {task.reward_amount / FLOAT_SCALING}
                            </p>
                            <Link
                              isExternal
                              href={`https://suiscan.xyz/devnet/object/${task.id}`}
                              showAnchorIcon
                            >
                              View on Blockchain
                            </Link>
                          </ScrollShadow>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              </Tab>*/}
          </Tabs>
        </div>
      </div>
      {/* Modal for publishing task */}
      <Modal
        isOpen={isOpenModal1}
        onOpenChange={onOpenChangeModal1}
        placement="top-center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Mint a Task</ModalHeader>
              <ModalBody>
                <Input
                  label="Reward Type"
                  value={newTask.reward_type}
                  onChange={(e) =>
                    setNewTask({ ...newTask, reward_type: e.target.value })
                  }
                />
                <Input
                  label="Task Name"
                  value={selectedTask ? selectedTask.name : newTask.name}
                  onChange={(e) =>
                    setNewTask({ ...newTask, name: e.target.value })
                  }
                />
                <Input
                  label="Description"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                />
                <Input
                  label="Task Image URL"
                  value={newTask.image_url}
                  onChange={(e) =>
                    setNewTask({ ...newTask, image_url: e.target.value })
                  }
                />
                <Input
                  label="Task Area"
                  value={newTask.area}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      area: e.target.value,
                    })
                  }
                />
                <Input
                  label="Task MOD"
                  value={newTask.moderator}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      moderator: e.target.value,
                    })
                  }
                />
                <Input
                  label="Task Fund"
                  value={newTask.fund}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      fund: e.target.value,
                    })
                  }
                />
                <Input
                  label="Reward Amount"
                  type="number"
                  value={newTask.reward_amount}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      reward_amount: e.target.value,
                    })
                  }
                />
                <Input
                  label="Proof of completion Image URL"
                  value={newTask.poc_img_url}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      poc_img_url: e.target.value,
                    })
                  }
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="flat"
                  onPress={onClose}
                  onClick={() => {
                    setSelectedTask(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  color="primary"
                  onPress={onClose}
                  onClick={() => {
                    handlePublishTaskChain();
                  }}
                >
                  Publish Task
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {/* Modal for Task MOD*/}
      <Modal
        isOpen={isOpenModal2}
        onOpenChange={onOpenChangeModal2}
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                Submissions for {selectedTask ? selectedTask.name : ""}
              </ModalHeader>
              <ModalBody>
                {/* // Display Pending Review Tasks */}
                {filteredTaskSheets.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Image
                      removeWrapper
                      alt="Eyes"
                      src="/frens/pureEyes.png"
                      className="z-0 w-12 h-12"
                    />
                    <p style={{ textAlign: "center", marginLeft: "8px" }}>
                      No Submission Yet
                    </p>
                  </div>
                ) : (
                  filteredTaskSheets.map((taskSheet, index) => {
                    const explorerObjUrl = `${DEVNET_EXPLOR_OBJ}${taskSheet.data.content.fields.id.id}`;
                    return (
                      <Checkbox
                        key={index}
                        value={taskSheet.data.content.fields.id.id}
                        onChange={handleChange}
                      >
                        {truncateAddress(taskSheet.data.content.fields.id.id)}{" "}
                        {"| "}
                        <a
                          href={explorerObjUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "lightblue",
                            textDecoration: "underline",
                          }}
                        >
                          View on Blockchain
                        </a>
                      </Checkbox>
                    );
                  })
                )}
                {/*<Checkbox value="tasksheet 1" onChange={handleChange}>
                  tasksheet 1
                </Checkbox>*/}
                <Textarea
                  maxRows={3}
                  label="Comments"
                  placeholder="Enter your comments"
                  onChange={(e) => {
                    setAnnotation(e.target.value);
                  }}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="flat"
                  onPress={onClose}
                  onClick={() =>
                    handleReject(
                      annotation,
                      selectedTask ? selectedTask.id : "",
                      selected,
                    )
                  }
                >
                  Reject
                </Button>
                <Button
                  color="primary"
                  onPress={onClose}
                  onClick={() =>
                    handleApprove(
                      annotation,
                      selectedTask ? selectedTask.id : "",
                      selected,
                    )
                  }
                >
                  Approve
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {/* //modal for 修改任務單內容 & 提取任務基金 & 增加任務基金 */}
      <Modal
        isOpen={isOpenModal3}
        onOpenChange={onOpenChangeModal3}
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{selectedTask ? selectedTask.name : ""}</ModalHeader>
              <ModalBody>
                <p>Edit Task Description</p>
                <div className="flex w-full flex-wrap md:flex-nowrap mb-6 md:mb-0 gap-4">
                  <Textarea
                    maxRows={3}
                    label="Description"
                    placeholder={`${
                      selectedTask
                        ? selectedTask.description[0].description
                        : ""
                    }`}
                    onChange={(e) => {
                      setTaskDescription(e.target.value);
                    }}
                  />
                </div>
                <Button
                  onPress={onClose}
                  onClick={() => {
                    handleTaskDescription(
                      selectedTask ? selectedTask.id : "",
                      taskDescription,
                    );
                  }}
                  color="primary"
                >
                  Save Changes
                </Button>
                <p>Take Fund</p>
                <Input
                  type="number"
                  label="Amount"
                  placeholder={`${selectedTask ? selectedTask.fund : 0}`}
                  className="max-w-lg"
                  onChange={(e) => {
                    setTaskFund(Number(e.target.value));
                  }}
                />
                <Button
                  color="danger"
                  onClick={() =>
                    handleTakeTaskFund(
                      selectedTask ? selectedTask.id : "",
                      taskFund,
                    )
                  }
                  onPress={onClose}
                >
                  Take Fund
                </Button>
                <p>Add Fund</p>
                <Input
                  type="number"
                  label="Amount"
                  placeholder={`${selectedTask ? selectedTask.fund : 0}`}
                  className="max-w-lg"
                  onChange={(e) => {
                    setTaskFund(Number(e.target.value));
                  }}
                />
                <Button
                  color="success"
                  onClick={() => {
                    handleAddTaskFund(
                      selectedTask ? selectedTask.id : "",
                      taskFund,
                    );
                  }}
                  onPress={onClose}
                >
                  Add Fund
                </Button>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
      {/* //Modal for 更新任務單內容 & 提交任務單  */}
      <Modal
        isOpen={isOpenModal4}
        onOpenChange={onOpenChangeModal4}
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{selectedTask ? selectedTask.name : ""}</ModalHeader>
              <ModalBody>
                <div className="flex w-full flex-wrap md:flex-nowrap mb-6 md:mb-0 gap-4">
                  <Textarea
                    minRows={80}
                    label="Task Record"
                    placeholder={"Enter your task record here"}
                    value={taskSheetDescription}
                    onChange={(e) => {
                      setTaskSheetDescription(e.target.value);
                    }}
                  />
                </div>
                <Button
                  color="warning"
                  onClick={() =>
                    handleTaskSheetDetails(
                      selectedTask ? selectedTask.id : "",
                      taskSheetDescription,
                    )
                  }
                  /*onPress={onClose}*/
                >
                  Update
                </Button>
                <Divider className="my-3" />
                <Button
                  color="primary"
                  onClick={() =>
                    handleSendTaskSheet(
                      selectedTask ? selectedTask.id : "",
                      taskSheetDescription,
                    )
                  }
                  onPress={onClose}
                >
                  Submit
                </Button>
              </ModalBody>
              <ModalFooter></ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default BasicContainer;
function setLoading(arg0: boolean) {
  throw new Error("Function not implemented.");
}
