# 关于不可压缩纳维-斯托克斯（Navier-Stokes）方程（以及对应的欧拉方程）的全局正则性问题

（先放上Tao的原文）

原作者：Terence Tao （陶哲轩）

https://mathstodon.xyz/@tao/117207849921390904

翻译：ChatGPT 5.6

润色：Gemini 3.1 Pro



要想找一个具体的例子，来看看人工智能在解决重大未解问题上的突破将如何抑制一个数学领域未来的发展，不可压缩纳维-斯托克斯（Navier-Stokes）方程（以及对应的欧拉方程）的全局正则性问题便是绝佳的例证。

直到最近，这个问题一直有望成为“AI 辅助数学”最被看好的成功典范之一：AI 工具不仅能用来解决问题本身，还能为该领域下一阶段的发展铺平道路。虽然该问题目前仍悬而未决，但现在越来越可能出现一种现实的走向——一个主要由 AI 生成的解答横空出世，但其呈现方式却“污染”了该问题，使其不再能作为推动未来数学进展的源泉。

尽管这些方程源于非常自然的物理动机——即对不可压缩流体的研究——但正则性问题的重要性并不主要体现在它的直接物理应用上。计算流体力学早已是一门成熟的学科，并被广泛应用于大气科学等领域，人们对其在实际应用中的能力与局限已了如指掌。对于这些方程，无论是在理论上保证其正则性，还是反之找到一个发生爆破（blowup）的病态实例，在智识上固然对这些应用领域颇具吸引力，但并不会彻底颠覆我们现有的天气预报或气候变化建模方式。

然而，纵观历史，试图解决这两个问题的种种努力，曾为流体力学、分析学以及偏微分方程领域带来了根本性的洞见和极具影响力的定理：Leray-Hopf 弱解、Gagliardo-Nirenberg-Ladyshenskaya 不等式、Prodi-Serrin 部分正则性定理、Beale-Kato-Majda 爆破判据、Escauriaza-Seregin-Sverak 条件正则性结果等等。更为广泛的湍流理论，虽然与上述结果没有直接联系，但至少在思想哲学的层面上，无疑受到了“试图证明或证伪全局正则性”这一系列努力的启发。我本人在该领域的一项贡献，便是将“流体计算”和“图灵普适性（Turing universality）”的概念引入该问题，这不仅带来了许多成果，还促成了其与辛拓扑之间出人意料的联系。

随着近年来对相关流体方程理解的不断深入，目前学界正在形成一种共识：Navier-Stokes 全局正则性问题的答案是否定的。也就是说，该问题应该存在某些极其特殊的初始条件，使其在有限时间内演化出奇点。目前甚至已经有了一套相当明确的策略来寻找这类初始条件：

(a) 构造一个近似自相似的“拟设”（ansatz，即预设的解的形式），用于描述有限时间内的爆破解。
(b) 在此拟设下寻找一个近似解，使其在数值上符合该拟设，且误差（残差）极小且可计算。
(c) 证明在适当的重整化坐标系下，该拟设在该数值解附近是稳定的；且如果残差足够小，则可将其扰动为一个精确解。
(d) 验证该解的残差确实落入了其稳定性阈值之内。

问题在于，所有这些步骤都极其复杂，且环环相扣。许多过于朴素的拟设会因为违反能量守恒等各种原因被证明根本不存在；而另一些拟设最初看似可行，却只有在经历了极其密集的数值计算后才能被最终排除。

尽管如此，我们似乎依然有望解决这个问题——前提是依靠一种史诗般的组合：将机器学习驱动的模拟、严格的区间算术和/或形式化验证、由大语言模型（LLM）生成的拟设建议相结合，并在人类专家级数学家的指导下，从过去的尝试中不断迭代学习。最终构造出的解极有可能无比庞大和复杂，以至于纯靠人力根本无法验证；若将其转换为 Lean 等形式化语言进行验证，它可能会成为人类有史以来创造的规模最大的形式化证明产物之一。

然而，这种令人费解的庞大证明本身，并不是这项演练的核心价值。真正的价值在于这个过程：从某个拟设出发，发现导致其失效的确切障碍，调整拟设以（部分）消除该障碍，然后不断迭代。这一过程几乎必然会揭示出关于流体力学的重要新洞见，而这些洞见是根本无法通过其他途径获取的。至关重要的是，**只有在迭代者没有事先获得最终正确答案的情况下，这种迭代才能有效地产生上述洞见。因为提前知晓最终拟设，必然会抑制对其他可能路径的探索**；那些路径表面上看是“死胡同”，但实际上它们为何失败、如何失败，往往具有极高的启发意义。

可是，现在出现了这样一种潜在情境：一个由海量计算资源支撑的自主 AI 框架系统（AI harness），在内部直接完成了整个迭代过程，最终输出了那个终极拟设，进而解开了 Navier-Stokes 正则性问题；而运行该系统的 AI 公司，却将得出该拟设的整个过程视为黑盒，几乎完全不对外公开。从技术层面上讲，数学界最著名的开放问题之一确实被解决了；但随之而来的结果是，它几乎没有为数学界本身增添任何价值。理论上，第三方或许可以凭借艰苦卓绝的额外努力（并且依然要严重依赖 AI 辅助），对这一解答的某部分进行逆向工程，从而恢复出一些真正的数学洞见与理解；但相比于前文所述的“由多样化的人类数学家与机器辅助相结合”的解题过程，这种逆向工程的效率要低下得多。

归根结底，像全局正则性这样的纯数学问题，其存在的意义有别于那些亟待解决的现实问题（如寻找针对特定疾病的疗法，或提高某台发动机的能效）。在纯数学领域，大多数时候我们提出问题，并非是因为我们极其渴望得到这个答案本身，而是因为过去的经验告诉我们：由人类主导的解题过程，往往能通过解题的努力本身来推动整个领域的进步；而在部分或完整解答出现后，人类对其进行消化吸收，又能提炼出新的洞见。如果不具备充分的过程透明度，仅仅依靠纯 AI 力量过早地“秒杀”这个问题，就会“污染”上述的探索生态。这种污染甚至会严重到一种地步：解决该问题本身，对整个数学学科的发展反而造成了净负面影响。

————————————

以上是陶的发帖的翻译。

很多数学相关的朋友在我转发了ChatGPT关于孪生素数的成果后，找我讨论AI数学的事情，争论点集中在Lean可不可靠上。**我认为Claude最近用1300万行Lean完成由怀尔斯解决的费马大定理，足以证明它的可用性，以及AI公司对此的态度。**所以我也认为Lean只要继续更新和改进，可以承担AI数学的很多验证工作，让Fable/Astra这种等级的智能体的研究循环甚至是两者间合作研究更有效率。

反而是陶的发帖振聋发聩，值得郑重对待。

陶的主旨，在我看来很像那个经典的“黄金原野”寓言：垂垂老矣的农场主叫来自己的子女，欺骗他们说自家的田地里埋着黄金。渴望黄金的子女们于是一遍一遍的犁地，最终把荒地变成了宝贵的良田，黄金是否存在也不再重要。

截至目前，刘慈欣发表的最后一部科幻小说用的也是这个寓言的模板和标题——《黄金原野》。庞大的科研项目本身，能带动很多相关研究，即使部分研究走向死胡同也具备附加的挖掘价值。如果由AI爆破，人类数学界会失去挖掘这些死胡同的动机。这些推论都是合理的，这些命题也爆破一个少一个。

然而笔者的态度是——比起等待这些潜在的附加价值慢慢被采摘孕育成熟，人类恐怕等不及借助AI率先验证一些问题，攫取这些成果，在能源枯竭、地球环境恶化之前，拿到几个功利的解的答案。古典教育式的注重附加价值的培育理念，在工业化、机械化的催熟流程前，向来是无力的。

也许人类未来会为了验证“如果不由ai找出问题的解，而是由人类慢慢研究理解，会长成怎样的科技树”这一点，用ai模拟一个全新的人类进程，也说不定。但在那之前，能源、地缘政治、癌症、传染病、劳动力质量下降已经足够人类拿出最功利的态度，迈上朝圣之路。

以下是陶的发帖的原文。

————————————

A concrete example of how AI advances in solving key open problems could inihibit the future development of a mathematical field can be found in the global regularity problem for the incompressible Navier-Stokes equations (as well as its counterpart for the Euler equations).  Until recently, this problem was on track to be one of the most promising examples of an AI-assisted success story, in which AI tools could be used both to solve the problem and to set the stage for the next round of progress in the field.  While the problems remain open for now, there is now an increasingly realistic scenario in which a primarily AI-generated solution to the problem appears, but in a fashion that contaminates the problem as a source of further advances.

While the equations do come from a very natural physical motivation - the study of incompressible fluids - the regularity problem is not important for its direct physical application.  Computational fluid dynamics is already a mature subject, deployed extensively in the atmospheric sciences, for instance, and its empirical capabilities and limitations are already well understood.  A theoretical guarantee of regularity, or conversely a pathological instance of blowup, for these equations would be intellectually interesting for such applications, but would not radically transform the way we would, for instance, model weather prediction or climate change.

But attempts to resolve either of these two questions have historically led to fundamental insights and influential theorems in fluid mechanics, analysis, and partial differential equations: the Leray-Hopf weak solutions, the Gagliardo-Nirenberg-Ladyshenskaya inequalities, the Prodi-Serrin partial regularity theorems, the Beale-Kato-Majda blowup criterion, the Escuriaza-Seregin-Sverak conditional regularity result, and so forth.  The broader theory of turbulence, while not directly connected to any of these results, has certainly been informed at a philosophical level at least by the efforts to establish or disprove global regularity.  One of my own contributions to the subject was to introduce the concept of fluid computation and Turing universality to the problem, which among other things led to the unexpected connections with symplectic topology.

With recent advances in understanding related fluid equations, it is now the emerging consensus that the answer to the global regularity problem for Navier-Stokes is negative: there should exist very specific initial conditions to this problem that develop singularities in finite time.  There is even a reasonably well-defined strategy to locate such conditions:

(a) Design a nearly-self-similar ansatz for a finite time blowup solution.
(b) Locate an approximate solution to this ansatz, which numerically obeys the ansatz up to an extremely small, computable residual.
(c) Demonstrate that, in suitably renormalized coordinates, the ansatz is stable around this numerical solution, and can be perturbed into an exact solution if the residual is small enough.
(d) Verify that the residual of the solution falls within the threshold of stability of the solution.

The problem is that all of these steps are incredibly complicated, and interlock with each other.  Many naive ansätze for these solutions can be ruled out to exist for various reasons, such as violation of conservation of energy.  Other ansätze might initially seem viable, but could only be ruled out after extremely intensive numerical computation.

Nevertheless, it seems potentially possible that a heroic combination of machine learning-powered simulation, rigorous interval arithmetic and/or formalization, and LLM-generated proposals for a suitable ansatz, all guided by expert human mathematicians iteratively learning from previous attempts, could resolve this problem.  The final construction would likely be enormously complicated, and impossible to verify by purely human means; the verification of it in a formal language such as Lean may end up being among the largest such proof artefacts ever created.

But such an incomprehensible proof would not be the primary value of the exercise.  The process of starting with one ansatz, discovering the precise obstruction preventing it from working, adjusting the ansatz to (partially) eliminate that obstruction, and then iterating, would almost certainly reveal important new insights about fluid mechanics that would not have been feasible to obtain by other means.  Crucially, this iteration would only work well at producing such insights if the iterator did not have access to the final ansatz in advance, as this naturally inhibits the exploration of alternate routes to the ansatz that are superficially "dead ends", but in fact end up being highly instructive in the nature of their failure.

But there is now a scenario in which an autonomous AI harness, backed by an enormous amount of computational resources, performs this entire iteration internally, and ends up producing the final ansatz, and thence the solution to the Navier-Stokes regularity problem, while the AI company running the harness keeps the process to arrive at that ansatz almost completely out of public view.  Technically, one of the most prominent open problems in mathematics would now be solved; but there would be almost no value added to mathematics as a consequence.  It is theoretically possible that with some herculean (and heavily AI-assisted) additional effort by a third party, some portion of the process could be reverse-engineered to recover some actual insight and understanding from the solution; but this would be a far less efficient process than if the solution had been obtained via a diverse combination of both human mathematicians and machine assistance as mentioned above.

Fundamentally, problems in pure mathematics, such as the global regularity problem, serve a different purpose than immediately practical problems, such as that of finding a cure to a specific disease, or increasing the energy efficiency of some engine.  In most cases in pure mathematics, the problems are posed not because we desperately want the solution to these problems in and of themselves, but because we have seen from past experience that human-directed efforts to solve these problems tend to spur further development of the field through the efforts to solve such problems, and then to digest any partial or complete solutions that emerge for further insights.  Prematurely solving the problem by purely AI-powered methods - particularly without full transparency into the solution process - can contaminate this process to the point where it actually becomes a net negative for the progress of mathematics as a whole.