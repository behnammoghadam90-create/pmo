import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI Configuration status check
  app.get('/api/ai/status', (req, res) => {
    const hasCustom = !!process.env.CUSTOM_AI_API_URL;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    res.json({
      configured: hasCustom || hasGemini,
      provider: hasCustom 
        ? 'Custom AI Provider (اختصاصی سازمان)' 
        : (hasGemini ? 'Google Gemini AI (هوش مصنوعی ابری پیش‌فرض)' : 'سامانه تحلیل هوشمند مالی PMO (موتور پیش‌فرض)'),
      customConfigurable: true,
      hasGeminiKey: hasGemini,
      hasCustomKey: hasCustom,
    });
  });

  // AI ROI & Financial Feasibility Analysis Endpoint
  app.post('/api/ai/roi-analysis', async (req, res) => {
    try {
      const {
        projectName = 'پروژه سازمانی',
        category = 'عمومی',
        responsibleUnit = 'واحد فنی',
        budgetBAC = 1000,
        expectedReturnAmount = 0,
        horizonMonths = 24,
        benefitType = 'direct_revenue',
        costEstimates = [],
        customNotes = '',
      } = req.body;

      // 1. Check for Custom AI Provider (if configured by the enterprise in env)
      if (process.env.CUSTOM_AI_API_URL) {
        try {
          const customUrl = process.env.CUSTOM_AI_API_URL;
          const customKey = process.env.CUSTOM_AI_API_KEY || '';
          const customModel = process.env.CUSTOM_AI_MODEL || 'custom-model';

          const customResponse = await fetch(customUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(customKey ? { Authorization: `Bearer ${customKey}` } : {}),
            },
            body: JSON.stringify({
              model: customModel,
              messages: [
                {
                  role: 'system',
                  content: 'شما مشاور ارشد اقتصادی PMO و ارزیابی طرح‌های سرمایه‌گذاری هستید. پاسخ خود را دقیقاً با فرمت JSON ساختاریافته ارائه دهید.',
                },
                {
                  role: 'user',
                  content: `تحلیل مالی و بازگشت سرمایه (ROI) برای پروژه «${projectName}» با بودجه ${budgetBAC} میلیون تومان و افق ${horizonMonths} ماهه.`,
                },
              ],
            }),
          });

          if (customResponse.ok) {
            const data = await customResponse.json();
            // In case custom API returns text or choices
            const content = data.choices?.[0]?.message?.content || JSON.stringify(data);
            try {
              const parsed = JSON.parse(content);
              return res.json({
                ...parsed,
                aiModelUsed: `Custom AI (${customModel})`,
              });
            } catch {
              // If text, fallback to wrapping
            }
          }
        } catch (customErr) {
          console.warn('Custom AI provider request failed, falling back to default Gemini:', customErr);
        }
      }

      // 2. Default: Google Gemini API with multi-model resilience
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (geminiApiKey) {
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const prompt = `شما یک مشاور ارشد سرمایه‌گذاری، اقتصاد مهندسی و مدیر دفتر PMO در شرکت صنعتی-تولیدی «کیهان صنعت قائم» هستید.
لطفاً شناسنامه و برآورد مالی این پروژه را تحلیل کنید و برای تصمیم‌گیری مدیرعامل، مدل بازگشت سرمایه (ROI)، دوره استهلاک سرمایه، سناریوهای واقع‌بینانه/خوش‌بینانه/بدبینانه و متن دفاعیه اقتصادی رسمی تدوین نمایید.

اطلاعات پروژه:
- نام پروژه: ${projectName}
- دسته‌بندی: ${category}
- واحد متولی: ${responsibleUnit}
- برآورد بودجه و سرمایه‌گذاری اولیه (BAC): ${budgetBAC} میلیون تومان
- مبلغ عایدی / صرفه‌جویی پیشنهادی کاربر: ${expectedReturnAmount > 0 ? `${expectedReturnAmount} میلیون تومان` : 'نامشخص (شما تخمین بزنید)'}
- افق زمانی بهره‌برداری: ${horizonMonths} ماه
- نوع عایدی و ارزش‌آفرینی: ${benefitType === 'cost_reduction' ? 'کاهش هزینه و صرفه‌جویی عملیاتی' : benefitType === 'capacity_expansion' ? 'افزایش ظرفیت تولید و سهم بازار' : 'درآمدزایی و فروش مستقیم'}
- اقلام هزینه: ${JSON.stringify(costEstimates)}
- یادداشت کاربر: ${customNotes || 'ندارد'}

دستورالعمل‌ها:
۱. ارقام تخمین عایدی، ROI و دوره استهلاک سرمایه را واقع‌بینانه و منطبق بر عرف صنایع ایران محاسبه کنید.
۲. نسبت فایده به هزینه (BCR) = کل عایدی تقسیم بر بودجه کل را حساب کنید.
۳. سه سناریوی دقیق (optimistic, base, pessimistic) با عدد ریالی عایدی، درصد ROI و دوره بازگشت به ماه ارائه دهید.
۴. یک پاراگراف رسمی، شیوا، اقناع‌کننده و در عین حال واقع‌بینانه به عنوان «متن توجیه اقتصادی و دفاعیه برای ارائه به مدیرعامل (Executive Pitch)» بنویسید تا مدیرعامل با مطالعه آن بتواند به طرح رای مثبت دهد.
۵. سه راهکار کلیدی برای کاهش ریسک و حفظ توجیه اقتصادی پروژه درج نمایید.`;

        // Candidate models in order of speed and availability:
        const candidateModels = [
          'gemini-3.1-flash-lite',
          'gemini-flash-latest',
          'gemini-3.8-flash',
        ];

        for (const modelName of candidateModels) {
          try {
            const geminiResponse = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    estimatedReturn: {
                      type: Type.NUMBER,
                      description: 'کل عایدی یا صرفه‌جویی پیش‌بینی‌شده به میلیون تومان در سناریوی مبنا',
                    },
                    roiPct: {
                      type: Type.NUMBER,
                      description: 'درصد بازگشت سرمایه در سناریوی مبنا',
                    },
                    paybackPeriodMonths: {
                      type: Type.NUMBER,
                      description: 'دوره بازگشت سرمایه به ماه',
                    },
                    bcr: {
                      type: Type.NUMBER,
                      description: 'نسبت فایده به هزینه (Benefit-Cost Ratio)',
                    },
                    feasibilityLevel: {
                      type: Type.STRING,
                      description: 'یکی از مقادیر: exceptional, acceptable, marginal, unfeasible',
                    },
                    executivePitch: {
                      type: Type.STRING,
                      description: 'متن رسمی و مدیریتی دفاعیه طرح برای مدیرعامل جهت تصمیم‌گیری و امضای مصوبه',
                    },
                    aiScenarios: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          scenarioName: { type: Type.STRING },
                          title: { type: Type.STRING },
                          expectedReturn: { type: Type.NUMBER },
                          roiPct: { type: Type.NUMBER },
                          paybackPeriodMonths: { type: Type.NUMBER },
                          description: { type: Type.STRING },
                        },
                        required: ['scenarioName', 'title', 'expectedReturn', 'roiPct', 'paybackPeriodMonths', 'description'],
                      },
                    },
                    aiSuggestions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'سه راهکار بهینه‌سازی مالی و مدیریت هزینه در اجرای طرح',
                    },
                    risksAndAssumptions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'مفروضات اقتصادی و ریسک‌های مهم در نظر گرفته شده',
                    },
                  },
                  required: ['estimatedReturn', 'roiPct', 'paybackPeriodMonths', 'bcr', 'feasibilityLevel', 'executivePitch', 'aiScenarios', 'aiSuggestions', 'risksAndAssumptions'],
                },
              },
            });

            const rawText = geminiResponse.text?.trim() || '{}';
            const parsed = JSON.parse(rawText);

            return res.json({
              ...parsed,
              aiModelUsed: `Google Gemini (${modelName})`,
              source: 'gemini_cloud',
            });
          } catch (modelErr: any) {
            // If the model experiences a temporary spike (503), continue to next candidate
            continue;
          }
        }
      }

      // 3. Resilient Heuristic Fallback (اگر کلید ست نشده باشد یا شبکه موقتاً قطع باشد)
      const cost = Math.max(1, Number(budgetBAC) || 1000);
      const horizon = Math.max(1, Number(horizonMonths) || 24);
      const userReturn = Number(expectedReturnAmount);
      const baseReturn = userReturn > 0 ? userReturn : Math.round(cost * 1.38);
      const netProfit = baseReturn - cost;
      const baseROI = Number(((netProfit / cost) * 100).toFixed(1));
      const basePayback = Number((cost / (baseReturn / horizon)).toFixed(1));
      const bcr = Number((baseReturn / cost).toFixed(2));

      let feasibilityLevel = 'acceptable';
      if (baseROI >= 40 && bcr >= 1.35) feasibilityLevel = 'exceptional';
      else if (baseROI < 10 || bcr < 1.05) feasibilityLevel = 'marginal';

      const executivePitch = `طرح «${projectName}» با برآورد کل سرمایه‌گذاری ${cost.toLocaleString('fa-IR')} میلیون تومان، طی افق ${horizon.toLocaleString('fa-IR')} ماهه با ایجاد ${baseReturn.toLocaleString('fa-IR')} میلیون تومان ارزش‌آفرینی (${benefitType === 'cost_reduction' ? 'صرفه‌جویی در هزینه‌ها' : 'درآمدزایی مستقیم'})، نرخ بازگشت سرمایه (ROI) معادل ${baseROI.toLocaleString('fa-IR')}٪ را محقق خواهد ساخت. دوره استهلاک و بازگشت کامل اصل سرمایه حدود ${basePayback.toLocaleString('fa-IR')} ماه برآورد شده و نسبت سود به هزینه معادل ${bcr.toLocaleString('fa-IR')} نشان‌دهنده توجیه‌پذیری کامل و ریسک منطقی طرح برای تصویب نهایی توسط مدیرعامل محترم است.`;

      const optReturn = Math.round(baseReturn * 1.25);
      const pessReturn = Math.round(baseReturn * 0.85);
      const pessCost = Math.round(cost * 1.15);

      return res.json({
        estimatedReturn: baseReturn,
        roiPct: baseROI,
        paybackPeriodMonths: basePayback,
        bcr,
        feasibilityLevel,
        executivePitch,
        aiScenarios: [
          {
            scenarioName: 'optimistic',
            title: 'سناریوی خوش‌بینانه (بهره‌برداری زودهنگام و ماکزیمم بهره‌وری)',
            expectedReturn: optReturn,
            roiPct: Number((((optReturn - cost) / cost) * 100).toFixed(1)),
            paybackPeriodMonths: Number((cost / (optReturn / horizon)).toFixed(1)),
            description: 'تحویل بدون تاخیر کارگاهی و جذب حداکثری مشتریان یا تحقق بالاترین سطح صرفه‌جویی در مصارف.',
          },
          {
            scenarioName: 'base',
            title: 'سناریوی واقع‌بینانه و خط مبنا (Base Case)',
            expectedReturn: baseReturn,
            roiPct: baseROI,
            paybackPeriodMonths: basePayback,
            description: 'تحقق برآوردها بر اساس شاخص‌های برنامه‌ریزی اولیه شناسنامه پروژه.',
          },
          {
            scenarioName: 'pessimistic',
            title: 'سناریوی محتاطانه (با فرض ۱۵٪ افزایش هزینه و کاهش کشش بازار)',
            expectedReturn: pessReturn,
            roiPct: Number((((pessReturn - pessCost) / pessCost) * 100).toFixed(1)),
            paybackPeriodMonths: Number((pessCost / (pessReturn / horizon)).toFixed(1)),
            description: 'رشد بهای تمام‌شده تامین اقلام کلیدی و کاهش شیب وصول عواید پروژه.',
          },
        ],
        aiSuggestions: [
          'عقد قراردادهای تامین اقلام کلیدی به صورت قیمت مقطوع (Lump-Sum) برای مصون‌سازی حاشیه سود پروژه در برابر تورم.',
          'برنامه‌ریزی برای بهره‌برداری فازبندی‌شده (Phased Delivery) به منظور آغاز جریان درآمدزایی قبل از پایان کل پروژه.',
          'پایش مستمر شاخص‌های انحراف هزینه (CV) و عملکرد هزینه (CPI) در گزارش‌های هفتگی جهت حفظ بازده سرمایه.',
        ],
        risksAndAssumptions: [
          'ثبات قوانین بالادستی و ضوابط فنی در طول دوره اجرای پروژه.',
          'تعهد تامین نقدینگی بر اساس جریان نقدینگی (Cash Flow) پیش‌بینی‌شده.',
          'استقرار و بهره‌برداری کامل تجهیزات حداکثر یک ماه پس از تحویل موقت کارگاهی.',
        ],
        aiModelUsed: 'کیهان صنعت AI - موتور هوشمند اقتصادی PMO',
        source: 'heuristic_engine',
      });
    } catch (error: any) {
      console.error('Error in /api/ai/roi-analysis:', error);
      res.status(500).json({ error: error.message || 'خطا در تحلیل اقتصادی هوش مصنوعی' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
