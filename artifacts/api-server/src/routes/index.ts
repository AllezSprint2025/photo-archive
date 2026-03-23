import { Router, type IRouter } from "express";
import healthRouter from "./health";
import albumsRouter from "./albums";
import checkoutRouter from "./checkout";
import webhooksRouter from "./webhooks";
import downloadRouter from "./download";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(albumsRouter);
router.use(checkoutRouter);
router.use(webhooksRouter);
router.use(downloadRouter);
router.use(adminRouter);

export default router;
