import express from "express";
import { createServer as createViteServer } from "vite";
import { Telegraf, Context, Markup, session } from "telegraf";
import LocalSession from "telegraf-session-local";
import db from "./database.ts";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005; // Changed default from 3000 to 3005 to avoid conflicts

app.use(express.json());

// --- Telegram Bot Logic ---
const botToken = "8768988908:AAFAvtNbQGLMX1heOH2cPdRypK3maDmiPnM";
const PAYMENT_PROVIDER_TOKEN = "381764678:TEST:170163";
let bot: Telegraf<any> | null = null;

if (botToken) {
  bot = new Telegraf(botToken);
  
  const localSession = new LocalSession({ database: 'sessions.json' });
  bot.use(localSession.middleware());

  const startLogic = async (ctx: any, isEdit = false) => {
    ctx.session.step = null;
    ctx.session.order = null;
    const text = "Амар мэндэ! 🙏 Добро пожаловать в официальный бот для заказа молебнов.\n\nЗдесь вы можете передать имена на хуралы и сделать добровольное подношение.\n\nВыберите нужное действие ниже:";
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📅 Молебны на сегодня", "menu_today")],
      [Markup.button.callback("📜 Все молебны", "menu_all")],
      [Markup.button.callback("📝 Мои заказы", "menu_orders"), Markup.button.callback("❓ Помощь", "menu_help")]
    ]);

    if (isEdit) {
      await ctx.editMessageText(text, keyboard).catch(() => {});
    } else {
      // Убираем старую нижнюю клавиатуру, если она осталась
      const msg = await ctx.reply("Загрузка...", Markup.removeKeyboard());
      await ctx.deleteMessage(msg.message_id).catch(() => {});
      await ctx.reply(text, keyboard);
    }
  };

  bot.start((ctx) => startLogic(ctx, false));
  bot.action("back_to_main", (ctx) => startLogic(ctx, true));

  bot.action("menu_help", async (ctx) => {
    await ctx.editMessageText(
      "🙏 *Как пользоваться ботом:*\n\n1. Выберите «Молебны на сегодня» или «Все молебны».\n2. Нажмите на нужный хурал.\n3. Напишите имена (желательно в родительном падеже).\n4. При желании укажите сумму подношения.\n\nЛамы увидят ваш заказ в системе и прочитают молитвы. Вы получите уведомление, когда молебен будет завершен.",
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Назад в меню", "back_to_main")]])
      }
    );
  });

  bot.command("admin", (ctx) => {
    const text = ctx.message.text.split(" ");
    if (text[1] === "Лама2026+") {
      try {
        db.prepare("INSERT OR REPLACE INTO admins (telegram_id, role) VALUES (?, 'lama')").run(ctx.from.id.toString());
        ctx.reply("✅ Вы успешно зарегистрированы как Лама. Вы будете получать только имена для молебнов.");
      } catch (e) {
        ctx.reply("Ошибка при регистрации.");
      }
    } else if (text[1] === "master") {
      ctx.session.step = 'awaiting_master_password';
      ctx.reply("Введите пароль мастера:");
    } else {
      ctx.reply("Использование: /admin [пароль] или /admin master");
    }
  });

  async function notifyLamas(prayerName: string, names: string) {
    const lamas = db.prepare("SELECT telegram_id FROM admins WHERE role = 'lama'").all() as any[];
    const message = `🙏 *Новый заказ на молебен*\n\nМолебен: *${prayerName}*\nИмена: ${names}`;
    for (const lama of lamas) {
      try {
        await bot!.telegram.sendMessage(lama.telegram_id, message, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error(`Failed to notify lama ${lama.telegram_id}`, e);
      }
    }
  }

  async function notifyMasters(message: string) {
    const masters = db.prepare("SELECT telegram_id FROM admins WHERE role = 'master'").all() as any[];
    for (const master of masters) {
      try {
        await bot!.telegram.sendMessage(master.telegram_id, message, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error(`Failed to notify master ${master.telegram_id}`, e);
      }
    }
  }

  bot.action("menu_today", async (ctx) => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1; // 1-12
    const year = today.getFullYear();

    // Ежедневные хуралы (по названиям из БД)
    const dailyPrayerNames = ['Намсарай Сахюусан', 'Юм Нити', 'Манай Баатруудад'];
    let todayPrayerNames = [...dailyPrayerNames];

    // Расписание на март 2026
    if (year === 2026 && month === 3) {
      const marchSchedule: Record<number, string> = {
        15: 'Юм Чун',
        16: 'Доржо Жодбо',
        17: 'Даши Зэгба',
        18: 'Найман Гэгээн',
        19: '21 Дара Эхын Магтаал',
        20: 'Сагаан Дара Эхын Тарни 108',
        21: 'Табан Харюулга',
        22: 'Цедо',
        23: 'Заһалай найман ном',
        24: 'Согто Зандан',
        25: 'Сунды',
        26: 'Отошо хурал',
        27: 'Юм Нити',
        28: 'Насны гурбан судар',
        29: 'Алтан Гэрэл',
        30: 'Найман Гэгээн',
        31: 'Зурган Юроол'
      };
      if (marchSchedule[day]) {
        todayPrayerNames.push(marchSchedule[day]);
      }
    }

    // Находим эти хуралы в БД
    const placeholders = todayPrayerNames.map(() => '?').join(',');
    const prayers = db.prepare(`SELECT * FROM prayers WHERE is_active = 1 AND name IN (${placeholders})`).all(...todayPrayerNames) as any[];

    if (prayers.length === 0) {
      return ctx.editMessageText("На сегодня нет активных молебнов в расписании.", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Назад в меню", "back_to_main")]]));
    }

    const buttons = prayers.map(p => [Markup.button.callback(p.name, `select_prayer_${p.id}`)]);
    buttons.push([Markup.button.callback("⬅️ Назад в меню", "back_to_main")]);
    
    const dateStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    await ctx.editMessageText(`📅 *Расписание на сегодня (${dateStr}):*\n\n09:00 — Намсарай Сахюусан\n14:00 — Юм Нити\n15:00 — Основной хурал дня\n16:00 — Манай Баатруудад\n\nВыберите молебен для заказа:`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  });

  bot.action("menu_all", async (ctx) => {
    await sendPrayersPage(ctx, 0, true);
  });

  bot.action(/^prayers_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await sendPrayersPage(ctx, page, true);
  });

  async function sendPrayersPage(ctx: any, page: number, isEdit = false) {
    const limit = 6;
    const offset = page * limit;
    
    const totalPrayers = (db.prepare("SELECT COUNT(*) as count FROM prayers WHERE is_active = 1").get() as any).count;
    const prayers = db.prepare("SELECT * FROM prayers WHERE is_active = 1 LIMIT ? OFFSET ?").all(limit, offset) as any[];
    
    if (prayers.length === 0 && page === 0) {
      const msg = "На данный момент нет активных молебнов.";
      return isEdit ? ctx.editMessageText(msg) : ctx.reply(msg);
    }

    const buttons = prayers.map(p => [Markup.button.callback(p.name, `select_prayer_${p.id}`)]);
    
    const paginationButtons = [];
    if (page > 0) {
      paginationButtons.push(Markup.button.callback("⬅️ Назад", `prayers_page_${page - 1}`));
    }
    if (offset + limit < totalPrayers) {
      paginationButtons.push(Markup.button.callback("Вперед ➡️", `prayers_page_${page + 1}`));
    }
    
    if (paginationButtons.length > 0) {
      buttons.push(paginationButtons);
    }
    
    buttons.push([Markup.button.callback("⬅️ Назад в меню", "back_to_main")]);
    
    const text = `Выберите молебен из списка (Страница ${page + 1}):`;
    if (isEdit) {
      await ctx.editMessageText(text, Markup.inlineKeyboard(buttons));
    } else {
      await ctx.reply(text, Markup.inlineKeyboard(buttons));
    }
  }

  bot.action("menu_orders", async (ctx) => {
    const orders = db.prepare("SELECT o.*, p.name as prayer_name FROM orders o JOIN prayers p ON o.prayer_id = p.id WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 5").all(ctx.from.id.toString()) as any[];
    
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback("⬅️ Назад в меню", "back_to_main")]]);

    if (orders.length === 0) {
      return ctx.editMessageText("У вас пока нет заказов.", keyboard);
    }

    let message = "📝 *Ваши последние заказы:*\n\n";
    orders.forEach(o => {
      const status = o.status === 'pending' ? '⏳ Ожидает' : o.status === 'verified' ? '💳 Оплачен' : '🙏 Прочитан';
      message += `🔹 *${o.prayer_name}*\nИмена: ${o.names}\nСтатус: ${status}\n\n`;
    });
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
  });

  bot.action(/^select_prayer_(\d+)$/, async (ctx) => {
    const prayerId = ctx.match[1];
    const prayer = db.prepare("SELECT * FROM prayers WHERE id = ?").get(prayerId) as any;
    
    if (!prayer) return ctx.answerCbQuery("Молебен не найден");

    ctx.session.order = { prayerId, prayerName: prayer.name };
    ctx.session.step = 'awaiting_names';
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(`Вы выбрали: *${prayer.name}*\n\nПожалуйста, напишите **имена** (через запятую), за кого нужно помолиться.`, { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback("⬅️ Назад в меню", "back_to_main")]])
    });
  });

  bot.action('cancel_order', async (ctx) => {
    ctx.session.step = null;
    ctx.session.order = null;
    await ctx.answerCbQuery("Отменено");
    await startLogic(ctx, true);
  });

  bot.on('text', async (ctx) => {
    const state = ctx.session.step;
    const order = ctx.session.order;

    if (!state) return;

    if (state === 'awaiting_master_password') {
      if (ctx.message.text === 'Adminmaster5796') {
        try {
          db.prepare("INSERT OR REPLACE INTO admins (telegram_id, role) VALUES (?, 'master')").run(ctx.from.id.toString());
          ctx.reply("✅ Вы успешно зарегистрированы как Мастер-админ. Вы будете получать полную информацию о заказах и пожертвованиях.");
        } catch (e) {
          ctx.reply("Ошибка при регистрации.");
        }
      } else {
        ctx.reply("❌ Неверный пароль.");
      }
      ctx.session.step = null;
      return;
    }

    if (state === 'awaiting_names') {
      order.names = ctx.message.text;
      ctx.session.step = 'awaiting_amount';
      
      await ctx.reply(
        `✅ Принято! Имена записаны.\n\nТеперь вы можете указать **сумму добровольного подношения** (только цифры, например: 500).\n\nЕсли вы хотите передать имена без пожертвования, просто нажмите кнопку «Пропустить».`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback("⏩ Пропустить", "skip_amount")],
            [Markup.button.callback("❌ Отмена", "cancel_order")]
          ])
        }
      );
    } else if (state === 'awaiting_amount') {
      const amount = parseInt(ctx.message.text);
      if (isNaN(amount)) {
        return ctx.reply("Пожалуйста, введите только число (например, 500) или нажмите кнопку «Пропустить».");
      }
      
      order.amount = amount;
      await showSummary(ctx);
    }
  });

  bot.action('skip_amount', async (ctx) => {
    if (ctx.session.step !== 'awaiting_amount') return ctx.answerCbQuery();
    ctx.session.order.amount = 0;
    await ctx.answerCbQuery();
    await showSummary(ctx);
  });

  async function showSummary(ctx: any) {
    const order = ctx.session.order;
    ctx.session.step = 'confirming';
    await ctx.reply(
      `Проверьте ваш заказ:\n\n📌 Молебен: *${order.prayerName}*\n👥 Имена: ${order.names}\n💰 Сумма: ${order.amount || 0} руб.\n\nВсе верно?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback("✅ Подтвердить", "confirm_order")],
          [Markup.button.callback("❌ Отмена", "cancel_order")]
        ])
      }
    );
  }

  bot.action('confirm_order', async (ctx) => {
    if (ctx.session.step !== 'confirming') return ctx.answerCbQuery();
    await finalizeOrder(ctx);
    await ctx.answerCbQuery("Заказ подтвержден!");
  });

  bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

  bot.on('successful_payment', async (ctx) => {
    const orderId = ctx.message.successful_payment.invoice_payload;
    db.prepare("UPDATE orders SET status = 'verified' WHERE id = ?").run(orderId);
    
    const order = db.prepare("SELECT o.*, p.name as prayer_name FROM orders o JOIN prayers p ON o.prayer_id = p.id WHERE o.id = ?").get(orderId) as any;
    
    await ctx.reply("✅ Оплата прошла успешно! Ваш заказ принят и передан ламе.");
    await notifyUser(ctx.from.id.toString(), `💳 Ваш заказ был *оплачен* и передан ламе. Благодарим за пожертвование!`);
    
    if (order) {
      await notifyMasters(`💳 *Оплачен заказ!*\n\nМолебен: *${order.prayer_name}*\nИмена: ${order.names}\nСумма: ${order.donation_amount} руб.\nПользователь: @${order.username}`);
      await notifyLamas(order.prayer_name, order.names);
    }
  });

  async function finalizeOrder(ctx: any) {
    const order = ctx.session.order;
    try {
      const result = db.prepare(`
        INSERT INTO orders (telegram_id, username, prayer_id, names, donation_amount, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(ctx.from.id.toString(), ctx.from.username || 'Anonymous', order.prayerId, order.names, order.amount || 0);
      
      const orderId = result.lastInsertRowid;

      if (order.amount > 0) {
        await ctx.replyWithInvoice({
          title: `Пожертвование: ${order.prayerName}`,
          description: `Молебен: ${order.prayerName}. Имена: ${order.names}`,
          payload: orderId.toString(),
          provider_token: PAYMENT_PROVIDER_TOKEN,
          currency: 'RUB',
          prices: [{ label: 'Произвольная сумма', amount: order.amount * 100 }],
        });
      } else {
        await ctx.editMessageText(
          `✅ *Ваш заказ принят!*\n\nМолебен: *${order.prayerName}*\nИмена: ${order.names}\n\nМы пришлем вам уведомление, когда лама проверит заказ. 🙏`,
          { parse_mode: 'Markdown' }
        );
        await notifyMasters(`🔔 *Новый заказ (без оплаты)*\n\nМолебен: *${order.prayerName}*\nИмена: ${order.names}\nПользователь: @${ctx.from.username || 'Anonymous'}`);
        await notifyLamas(order.prayerName, order.names);
      }
      
      ctx.session.step = null;
      ctx.session.order = null;
    } catch (err) {
      console.error(err);
      ctx.reply("Произошла ошибка при сохранении заказа. Пожалуйста, попробуйте еще раз позже.");
    }
  }

  const secretPath = `/telegraf/${bot.secretPathComponent()}`;
  
  app.get("/api/bot-status", async (req, res) => {
    try {
      const me = await bot!.telegram.getMe();
      const webhookInfo = await bot!.telegram.getWebhookInfo();
      res.json({
        ok: true,
        bot: me.username,
        webhook: webhookInfo,
        token_present: !!botToken,
        app_url: process.env.APP_URL || "not set",
        mode: process.env.NODE_ENV === 'production' ? 'webhook' : 'polling'
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message, token_present: !!botToken });
    }
  });

  // Always use polling to ensure it works on any server
  console.log("[Bot] Starting in polling mode...");
  bot.telegram.deleteWebhook({ drop_pending_updates: true })
    .then(() => {
      bot!.launch({ dropPendingUpdates: true })
        .then(() => console.log("[Bot] Successfully started polling"))
        .catch(err => console.error("[Bot] Polling launch failed:", err));
    })
    .catch(err => console.error("[Bot] Failed to delete webhook:", err));
} else {
  console.error("[Bot] CRITICAL: TELEGRAM_BOT_TOKEN is not defined!");
  app.get("/api/bot-status", (req, res) => {
    res.json({ ok: false, error: "TELEGRAM_BOT_TOKEN is missing", token_present: false });
  });
}


app.get("/api/orders", (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, p.name as prayer_name 
    FROM orders o 
    JOIN prayers p ON o.prayer_id = p.id 
    ORDER BY o.created_at DESC
  `).all();
  res.json(orders);
});

async function notifyUser(telegramId: string, message: string) {
  if (bot) {
    try {
      await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(`Failed to notify user ${telegramId}:`, err);
    }
  }
}

app.post("/api/orders/:id/verify", async (req, res) => {
  const { id } = req.params;
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
  if (order) {
    db.prepare("UPDATE orders SET status = 'verified' WHERE id = ?").run(id);
    await notifyUser(order.telegram_id, `💳 Ваш заказ на молебен был *проверен* ламой. Благодарим за пожертвование!`);
  }
  res.json({ success: true });
});

app.post("/api/orders/:id/complete", async (req, res) => {
  const { id } = req.params;
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
  if (order) {
    db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(id);
    await notifyUser(order.telegram_id, `🙏 Молебен по вашему заказу был *прочитан*. Ом Мани Падме Хум!`);
  }
  res.json({ success: true });
});

app.get("/api/prayers", (req, res) => {
  const prayers = db.prepare("SELECT * FROM prayers").all();
  res.json(prayers);
});

app.post("/api/prayers", (req, res) => {
  const { name, description } = req.body;
  db.prepare("INSERT INTO prayers (name, description, is_active) VALUES (?, ?, 1)").run(name, description);
  res.json({ success: true });
});

app.post("/api/prayers/:id/toggle", (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE prayers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?").run(id);
  res.json({ success: true });
});

app.delete("/api/prayers/:id", (req, res) => {
  const { id } = req.params;
  // Check if there are orders for this prayer
  const ordersCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE prayer_id = ?").get(id) as any;
  if (ordersCount.count > 0) {
    return res.status(400).json({ error: "Cannot delete prayer with existing orders. Hide it instead." });
  }
  db.prepare("DELETE FROM prayers WHERE id = ?").run(id);
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

process.once('SIGINT', () => bot?.stop('SIGINT'));
process.once('SIGTERM', () => bot?.stop('SIGTERM'));
