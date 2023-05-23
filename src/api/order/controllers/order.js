'use strict';
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
/**
 * order controller
 */
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx) {
    const { stripeId, products, userName } = ctx.request.body;
    try {
      //retrieve item info
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id);

          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.name,
              },
              unit_amount: item.price * 100,
            },
            quantity: product.count,
          };
        })
      );

      // create stripe session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer: stripeId,
        success_url: `${process.env.FRONTEND_URL}/checkout/success`,
        cancel_url: `${process.env.FRONTEND_URL}/checkout/error`,
        line_items: lineItems,
      });

      // create the order
      await strapi.service("api::order.order").create({
        data: {
          userName, products, stripeSessionId: session.id, stripeId,
        },
      });

      // return session id
      return { id: session.id };
    } catch (error) {
      ctx.response.status = error.statusCode || 500;
      return error.message;
    }
  },
}));
