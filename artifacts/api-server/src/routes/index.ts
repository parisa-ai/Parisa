import { Router, type IRouter } from "express";
import healthRouter from "./health";
import parisaRouter from "./parisa";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/parisa", parisaRouter);

export default router;
